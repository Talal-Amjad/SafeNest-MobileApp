package app.safenest.vpn

import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

/** JVM tests for the filter's pure parts (run with ./gradlew test in a development build). */
class FilterTest {
  private val policy = Policy(
    listOf(
      Policy.Rule("r-yt", "youtube.com", "block"),
      Policy.Rule("r-music", "music.youtube.com", "allow"),
      Policy.Rule("r-idn", "bücher.de", "block"),
    ),
  )

  @Test fun mostSpecificRuleWins() {
    assertEquals(Policy.Decision(true, "r-yt"), policy.decide("m.youtube.com"))
    assertEquals(Policy.Decision(false, "r-music"), policy.decide("a.music.youtube.com"))
    assertEquals(Policy.Decision(false, null), policy.decide("example.com"))
    assertEquals(Policy.Decision(true, "r-yt"), policy.decide("WWW.YouTube.COM."))
    assertEquals(Policy.Decision(true, "r-idn"), policy.decide("shop.xn--bcher-kva.de"))
  }

  @Test fun dohProvidersAreRecognised() {
    assertTrue(DohProviders.isProvider("dns.google"))
    assertTrue(DohProviders.isProvider("x.mozilla.cloudflare-dns.com"))
    assertFalse(DohProviders.isProvider("google.com"))
  }

  @Test fun parsesQueryAndBuildsBlockedAnswer() {
    val packet = ipv4UdpQuery("tiktok.com", qtype = DnsPacket.TYPE_A)
    val q = assertNotNullAndGet(DnsPacket.parseQuery(packet, packet.size))
    assertEquals("tiktok.com", q.name)
    assertEquals(DnsPacket.TYPE_A, q.qtype)

    val answer = DnsPacket.blockedResponse(q)
    assertEquals(0x12, answer[0].toInt()) // same ID
    assertEquals(0x34, answer[1].toInt())
    assertTrue(answer[2].toInt() and 0x80 != 0) // QR
    assertEquals(1, answer[7].toInt()) // ANCOUNT
    assertArrayEquals(ByteArray(4), answer.copyOfRange(answer.size - 4, answer.size)) // 0.0.0.0

    val wrapped = DnsPacket.wrapResponse(q, answer)
    assertArrayEquals(packet.copyOfRange(16, 20), wrapped.copyOfRange(12, 16)) // src = old dst
    assertEquals(3, DnsPacket.nxdomain(q)[3].toInt() and 0x0F)
  }

  @Test fun ignoresNonDnsPackets() {
    val tcp = ipv4UdpQuery("a.com", DnsPacket.TYPE_A).also { it[9] = 6 }
    assertEquals(null, DnsPacket.parseQuery(tcp, tcp.size))
  }

  private fun <T> assertNotNullAndGet(v: T?): T {
    assertNotNull(v)
    return v!!
  }

  private fun ipv4UdpQuery(name: String, qtype: Int): ByteArray {
    val qname = name.split('.').flatMap { listOf(it.length.toByte()) + it.toByteArray().toList() } + 0.toByte()
    val dns = byteArrayOf(0x12, 0x34, 0x01, 0x00, 0, 1, 0, 0, 0, 0, 0, 0) +
      qname.toByteArray() + byteArrayOf(0, qtype.toByte(), 0, 1)
    val udp = byteArrayOf(0xC3.toByte(), 0x50, 0, 53, 0, (8 + dns.size).toByte(), 0, 0) + dns
    val ip = ByteArray(20).also {
      it[0] = 0x45; it[3] = (20 + udp.size).toByte(); it[8] = 64; it[9] = 17
      byteArrayOf(10, 111, 222.toByte(), 1).copyInto(it, 12)
      byteArrayOf(10, 111, 222.toByte(), 2).copyInto(it, 16)
    }
    return ip + udp
  }
}
