package app.safenest.vpn

import java.nio.ByteBuffer

/**
 * Minimal IPv4/UDP/DNS handling for the filter. The VPN routes only the
 * virtual DNS server's address, so every packet read from the tunnel is a
 * DNS query (anything else is dropped).
 */
object DnsPacket {
  const val TYPE_A = 1
  const val TYPE_AAAA = 28

  /** A UDP DNS query parsed out of an IPv4 packet from the tunnel. */
  class Query(
    val srcAddr: ByteArray,
    val dstAddr: ByteArray,
    val srcPort: Int,
    val dstPort: Int,
    val dns: ByteArray,
    val name: String,
    val qtype: Int,
    /** Offset just after the question section within [dns]. */
    val questionEnd: Int,
  )

  fun parseQuery(packet: ByteArray, length: Int): Query? {
    if (length < 28) return null
    val version = (packet[0].toInt() ushr 4) and 0xF
    if (version != 4) return null
    val ihl = (packet[0].toInt() and 0xF) * 4
    if (packet[9].toInt() and 0xFF != 17 || length < ihl + 8) return null // UDP only
    val src = packet.copyOfRange(12, 16)
    val dst = packet.copyOfRange(16, 20)
    val srcPort = u16(packet, ihl)
    val dstPort = u16(packet, ihl + 2)
    if (dstPort != 53) return null
    val dns = packet.copyOfRange(ihl + 8, length)
    if (dns.size < 12 || u16(dns, 4) != 1) return null // exactly one question
    val (name, end) = readName(dns, 12) ?: return null
    if (end + 4 > dns.size) return null
    return Query(src, dst, srcPort, dstPort, dns, name, u16(dns, end), end + 4)
  }

  /** NOERROR answer pointing the name at 0.0.0.0 / :: (fast failure in apps), no answer for other types. */
  fun blockedResponse(q: Query, ttl: Int = 60): ByteArray {
    val answer = when (q.qtype) {
      TYPE_A -> ByteArray(4)
      TYPE_AAAA -> ByteArray(16)
      else -> null
    }
    val buf = ByteBuffer.allocate(q.questionEnd + (if (answer != null) 12 + answer.size else 0))
    buf.put(q.dns, 0, q.questionEnd)
    val flagsHi = 0x80 or (q.dns[2].toInt() and 0x01) // QR=1, keep RD
    buf.put(2, flagsHi.toByte())
    buf.put(3, 0x80.toByte()) // RA=1, RCODE=0
    buf.putShort(6, (if (answer != null) 1 else 0).toShort()) // ANCOUNT
    buf.putShort(8, 0) // NSCOUNT
    buf.putShort(10, 0) // ARCOUNT (drops any EDNS record)
    if (answer != null) {
      buf.position(q.questionEnd)
      buf.putShort(0xC00C.toShort()) // pointer to the question name
      buf.putShort(q.qtype.toShort())
      buf.putShort(1) // class IN
      buf.putInt(ttl)
      buf.putShort(answer.size.toShort())
      buf.put(answer)
    }
    return buf.array().copyOf(q.questionEnd + (if (answer != null) 12 + answer.size else 0))
  }

  /** SERVFAIL: used when no upstream answered, so lookups fail closed. */
  fun servfail(q: Query): ByteArray {
    val out = q.dns.copyOf(q.questionEnd)
    out[2] = (0x80 or (q.dns[2].toInt() and 0x01)).toByte()
    out[3] = 0x82.toByte()
    for (i in 6 until 12) out[i] = 0
    return out
  }

  /** Wraps a DNS payload in IPv4/UDP addressed back to the querying app. */
  fun wrapResponse(q: Query, dns: ByteArray): ByteArray {
    val total = 20 + 8 + dns.size
    val p = ByteArray(total)
    p[0] = 0x45
    putU16(p, 2, total)
    p[8] = 64 // TTL
    p[9] = 17 // UDP
    System.arraycopy(q.dstAddr, 0, p, 12, 4)
    System.arraycopy(q.srcAddr, 0, p, 16, 4)
    putU16(p, 10, ipChecksum(p, 20))
    putU16(p, 20, q.dstPort)
    putU16(p, 22, q.srcPort)
    putU16(p, 24, 8 + dns.size)
    // UDP checksum 0 = not computed, which IPv4 allows.
    System.arraycopy(dns, 0, p, 28, dns.size)
    return p
  }

  private fun readName(b: ByteArray, start: Int): Pair<String, Int>? {
    val labels = mutableListOf<String>()
    var i = start
    while (i < b.size) {
      val len = b[i].toInt() and 0xFF
      if (len == 0) return labels.joinToString(".") to i + 1
      if (len and 0xC0 != 0 || i + 1 + len > b.size || labels.size > 127) return null // no pointers in questions
      labels += String(b, i + 1, len, Charsets.US_ASCII)
      i += 1 + len
    }
    return null
  }

  private fun u16(b: ByteArray, off: Int) = ((b[off].toInt() and 0xFF) shl 8) or (b[off + 1].toInt() and 0xFF)

  private fun putU16(b: ByteArray, off: Int, v: Int) {
    b[off] = (v ushr 8).toByte()
    b[off + 1] = v.toByte()
  }

  private fun ipChecksum(b: ByteArray, len: Int): Int {
    var sum = 0
    var i = 0
    while (i < len) {
      sum += u16(b, i)
      i += 2
    }
    while (sum ushr 16 != 0) sum = (sum and 0xFFFF) + (sum ushr 16)
    return sum.inv() and 0xFFFF
  }
}
