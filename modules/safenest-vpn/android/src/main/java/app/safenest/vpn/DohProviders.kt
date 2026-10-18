package app.safenest.vpn

/**
 * Well-known DNS-over-HTTPS endpoints. A browser using one would resolve
 * names without going through SafeNest, so the filter answers them as
 * blocked and browsers fall back to the system resolver (this VPN).
 * Same list as the Windows app (internal/dnsfilter/doh.go); keep in sync.
 */
object DohProviders {
  /** Answering NXDOMAIN tells Firefox's automatic DoH rollout to stay off. */
  const val FIREFOX_CANARY = "use-application-dns.net"

  private val hosts = setOf(
    "dns.google", "dns.google.com",
    "cloudflare-dns.com", "chrome.cloudflare-dns.com", "mozilla.cloudflare-dns.com",
    "one.one.one.one", "1dot1dot1dot1.cloudflare-dns.com",
    "security.cloudflare-dns.com", "family.cloudflare-dns.com",
    "dns.quad9.net", "dns9.quad9.net", "dns10.quad9.net", "dns11.quad9.net",
    "doh.opendns.com", "doh.familyshield.opendns.com",
    "dns.nextdns.io", "doh.cleanbrowsing.org",
    "dns.adguard.com", "dns.adguard-dns.com",
    "doh.mullvad.net", "dns.mullvad.net",
    "doh.dns.sb", "dns.controld.com", "freedns.controld.com",
    "doh.xfinity.com", "dns.brave.com",
  )

  /** True if host is, or is under, a known DoH endpoint. */
  fun isProvider(host: String): Boolean {
    var h = host
    while (h.isNotEmpty()) {
      if (h in hosts) return true
      val dot = h.indexOf('.')
      if (dot < 0) return false
      h = h.substring(dot + 1)
    }
    return false
  }
}
