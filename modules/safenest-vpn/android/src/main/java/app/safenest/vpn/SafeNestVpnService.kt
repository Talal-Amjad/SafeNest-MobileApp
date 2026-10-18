package app.safenest.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.DatagramPacket
import java.net.DatagramSocket
import java.net.InetAddress
import java.net.InetSocketAddress
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicReference

/**
 * A VPN that carries only DNS: the tunnel advertises a virtual DNS server
 * and routes just that address, so apps' lookups arrive here while all
 * other traffic goes straight to the network. Blocked names get 0.0.0.0 /
 * ::; allowed ones are forwarded to the upstream resolvers through sockets
 * excluded from the VPN. If no upstream answers, the lookup fails (closed).
 */
class SafeNestVpnService : VpnService() {
  private var tun: ParcelFileDescriptor? = null
  private var reader: Thread? = null
  private val workers = Executors.newFixedThreadPool(4)

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      shutdown()
      stopSelf()
      return START_NOT_STICKY
    }
    startForegroundNotice()
    if (tun == null) establish()
    // START_STICKY: Android restarts the filter if the process is killed.
    return START_STICKY
  }

  override fun onRevoke() {
    // The user turned the VPN off in system settings or another VPN started.
    shutdown()
    super.onRevoke()
  }

  override fun onDestroy() {
    shutdown()
    workers.shutdownNow()
    super.onDestroy()
  }

  private fun establish() {
    val pfd = Builder()
      .setSession("SafeNest")
      .addAddress(TUN_ADDRESS, 32)
      .addDnsServer(DNS_ADDRESS)
      .addRoute(DNS_ADDRESS, 32)
      .setBlocking(true)
      .also { b -> runCatching { b.addDisallowedApplication(packageName) } }
      .establish() ?: run {
        Log.w(TAG, "VPN consent missing; cannot establish")
        stopSelf()
        return
      }
    tun = pfd
    running = true
    reader = Thread({ loop(pfd) }, "safenest-dns").also { it.start() }
  }

  private fun loop(pfd: ParcelFileDescriptor) {
    val input = FileInputStream(pfd.fileDescriptor)
    val output = FileOutputStream(pfd.fileDescriptor)
    val packet = ByteArray(32767)
    while (running) {
      val n = try {
        input.read(packet)
      } catch (e: Exception) {
        if (running) Log.w(TAG, "tunnel read failed", e)
        break
      }
      if (n <= 0) continue
      val query = DnsPacket.parseQuery(packet, n) ?: continue
      val name = Policy.normalize(query.name)
      // Keep browsers on this resolver: refuse their own DNS-over-HTTPS.
      if (name == DohProviders.FIREFOX_CANARY) {
        write(output, DnsPacket.wrapResponse(query, DnsPacket.nxdomain(query)))
        continue
      }
      if (DohProviders.isProvider(name)) {
        write(output, DnsPacket.wrapResponse(query, DnsPacket.blockedResponse(query)))
        continue
      }
      val decision = policy.get().decide(name)
      if (decision.blocked) {
        recordBlocked(name, decision.ruleId ?: "")
        write(output, DnsPacket.wrapResponse(query, DnsPacket.blockedResponse(query)))
      } else {
        workers.execute { write(output, DnsPacket.wrapResponse(query, forward(query))) }
      }
    }
  }

  private fun forward(q: DnsPacket.Query): ByteArray {
    for (server in upstreams.get()) {
      try {
        DatagramSocket().use { s ->
          protect(s) // keep the forwarded query out of the tunnel
          s.soTimeout = 2500
          s.send(DatagramPacket(q.dns, q.dns.size, InetSocketAddress(InetAddress.getByName(server), 53)))
          val buf = ByteArray(4096)
          val reply = DatagramPacket(buf, buf.size)
          s.receive(reply)
          return buf.copyOf(reply.length)
        }
      } catch (e: Exception) {
        Log.d(TAG, "upstream $server failed: ${e.message}")
      }
    }
    return DnsPacket.servfail(q)
  }

  @Synchronized
  private fun write(out: FileOutputStream, packet: ByteArray) {
    try {
      out.write(packet)
    } catch (e: Exception) {
      if (running) Log.w(TAG, "tunnel write failed", e)
    }
  }

  private fun recordBlocked(domain: String, ruleId: String) {
    // Bounded, and one entry per domain per minute (a page triggers several lookups).
    val now = System.currentTimeMillis()
    if (blocked.any { it.domain == domain && now - it.at < 60_000 }) return
    blocked.add(Blocked(domain, ruleId, now))
    while (blocked.size > 500) blocked.poll()
  }

  private fun shutdown() {
    running = false
    reader?.interrupt()
    reader = null
    runCatching { tun?.close() }
    tun = null
  }

  private fun startForegroundNotice() {
    val nm = getSystemService(NotificationManager::class.java)
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      nm.createNotificationChannel(
        NotificationChannel(CHANNEL, "SafeNest protection", NotificationManager.IMPORTANCE_LOW),
      )
    }
    val open = packageManager.getLaunchIntentForPackage(packageName)?.let {
      PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
    }
    @Suppress("DEPRECATION")
    val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) Notification.Builder(this, CHANNEL) else Notification.Builder(this)
    val notification: Notification = builder
      .setContentTitle("SafeNest is protecting this phone")
      .setContentText("Website rules from a parent apply in every app.")
      .setSmallIcon(android.R.drawable.ic_lock_lock)
      .setContentIntent(open)
      .setOngoing(true)
      .build()
    if (Build.VERSION.SDK_INT >= 34) {
      startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  data class Blocked(val domain: String, val ruleId: String, val at: Long)

  companion object {
    private const val TAG = "SafeNestVpn"
    private const val CHANNEL = "safenest.protection"
    private const val NOTIFICATION_ID = 7001
    const val ACTION_STOP = "app.safenest.vpn.STOP"
    // Addresses from a private range used only inside the tunnel.
    private const val TUN_ADDRESS = "10.111.222.1"
    private const val DNS_ADDRESS = "10.111.222.2"

    val policy = AtomicReference(Policy(emptyList()))
    val upstreams = AtomicReference(listOf("1.1.1.1", "9.9.9.9"))
    val blocked = ConcurrentLinkedQueue<Blocked>()

    @Volatile
    var running = false
      private set
  }
}
