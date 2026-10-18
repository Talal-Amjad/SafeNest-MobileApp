package app.safenest.vpn

import java.net.IDN

/**
 * Same precedence as the SafeNest API and the Windows app: a domain rule
 * covers its subdomains, the most specific match wins, no match allows.
 * (src/lib/policy.ts is checked against the shared vectors; keep in sync.)
 */
class Policy(rules: List<Rule>) {
  data class Rule(val id: String, val value: String, val action: String)
  data class Decision(val blocked: Boolean, val ruleId: String?)

  private val byDomain: Map<String, Rule> = rules
    .filter { it.action == "block" || it.action == "allow" }
    .mapNotNull { r -> normalize(r.value).takeIf { it.isNotEmpty() }?.let { it to r } }
    .toMap()

  val enforced: Int get() = byDomain.size

  fun decide(host: String): Decision {
    val labels = normalize(host).split('.')
    for (i in labels.indices) {
      val rule = byDomain[labels.subList(i, labels.size).joinToString(".")] ?: continue
      return Decision(rule.action == "block", rule.id)
    }
    return Decision(false, null)
  }

  companion object {
    fun normalize(host: String): String {
      val h = host.trim().lowercase().trimEnd('.')
      return try {
        IDN.toASCII(h, IDN.ALLOW_UNASSIGNED)
      } catch (_: IllegalArgumentException) {
        h
      }
    }
  }
}
