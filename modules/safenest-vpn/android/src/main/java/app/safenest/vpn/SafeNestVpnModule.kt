package app.safenest.vpn

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray

class SafeNestVpnModule : Module() {
  private var pendingConsent: Promise? = null

  private val context
    get() = appContext.reactContext ?: throw CodedException("No React context")

  override fun definition() = ModuleDefinition {
    Name("SafeNestVpn")

    Function("isPrepared") { VpnService.prepare(context) == null }

    // Android shows its own VPN consent dialog the first time.
    AsyncFunction("prepare") { promise: Promise ->
      val intent = VpnService.prepare(context)
      val activity = appContext.currentActivity
      when {
        intent == null -> promise.resolve(true)
        activity == null -> promise.reject(CodedException("No activity to show the VPN consent dialog"))
        else -> {
          pendingConsent = promise
          activity.startActivityForResult(intent, CONSENT_REQUEST)
        }
      }
    }

    OnActivityResult { _, payload ->
      if (payload.requestCode == CONSENT_REQUEST) {
        pendingConsent?.resolve(payload.resultCode == Activity.RESULT_OK)
        pendingConsent = null
      }
    }

    AsyncFunction("start") { rulesJson: String, upstreams: List<String> ->
      if (VpnService.prepare(context) != null) throw CodedException("VPN consent has not been granted")
      SafeNestVpnService.policy.set(Policy(parseRules(rulesJson)))
      if (upstreams.isNotEmpty()) SafeNestVpnService.upstreams.set(upstreams)
      context.startService(Intent(context, SafeNestVpnService::class.java))
    }

    AsyncFunction("stop") {
      context.startService(Intent(context, SafeNestVpnService::class.java).setAction(SafeNestVpnService.ACTION_STOP))
    }

    Function("isRunning") { SafeNestVpnService.running }

    Function("drainBlocked") {
      val out = mutableListOf<Map<String, Any>>()
      while (true) {
        val b = SafeNestVpnService.blocked.poll() ?: break
        out += mapOf("domain" to b.domain, "ruleId" to b.ruleId, "at" to b.at.toDouble())
      }
      out
    }
  }

  private fun parseRules(json: String): List<Policy.Rule> {
    val arr = JSONArray(json)
    return (0 until arr.length()).map { i ->
      val o = arr.getJSONObject(i)
      Policy.Rule(o.getString("id"), o.getString("value"), o.getString("action"))
    }
  }

  companion object {
    private const val CONSENT_REQUEST = 7002
  }
}
