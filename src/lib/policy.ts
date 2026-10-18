import { toASCII } from "punycode/";
import type { Policy } from "@/api/types";

/**
 * Website rule evaluation, identical to the server's reference algorithm
 * (apps/api/app/services/policy.py) and the Windows app:
 *
 *  - a domain rule matches the domain and all its subdomains;
 *  - the most specific matching rule wins;
 *  - no match → allowed; non-domain rules are ignored here.
 *
 * Verified against the shared vectors in __tests__/precedence_vectors.json.
 * The Android VPN filter receives the compiled rules and applies the same
 * walk natively.
 */
export type Action = "block" | "allow";
export type Decision = { action: Action; ruleId: string | null };
export type PolicyRule = Policy["rules"][number];

export function normalizeHost(host: string): string {
  const h = host.trim().toLowerCase().replace(/\.+$/, "");
  try {
    return toASCII(h);
  } catch {
    return h;
  }
}

export type CompiledPolicy = Map<string, { action: Action; id: string }>;

export function compile(rules: PolicyRule[]): CompiledPolicy {
  const out: CompiledPolicy = new Map();
  for (const r of rules) {
    if (r.kind !== "domain" || (r.action !== "block" && r.action !== "allow")) continue;
    const domain = normalizeHost(r.value);
    if (domain) out.set(domain, { action: r.action, id: r.id });
  }
  return out;
}

/** Walk from the full host towards the registrable suffix; the first hit is the most specific. */
export function decide(policy: CompiledPolicy, host: string): Decision {
  const labels = normalizeHost(host).split(".");
  for (let i = 0; i < labels.length; i++) {
    const hit = policy.get(labels.slice(i).join("."));
    if (hit) return { action: hit.action, ruleId: hit.id };
  }
  return { action: "allow", ruleId: null };
}
