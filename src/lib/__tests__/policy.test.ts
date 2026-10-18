import { describe, expect, it } from "@jest/globals";
import { compile, decide, type PolicyRule } from "../policy";
import vectors from "./precedence_vectors.json";

type Suite = {
  name: string;
  rules: { id: string; kind: string; value: string; action: string }[];
  cases: { host: string; action: string; rule_id: string | null }[];
};

// Identical to the SafeNest API's and the Windows app's copies, so all three
// agree on what is blocked.
describe("shared precedence vectors", () => {
  for (const suite of vectors.suites as Suite[]) {
    const policy = compile(suite.rules as PolicyRule[]);
    for (const c of suite.cases) {
      it(`${suite.name}: ${c.host}`, () => {
        expect(decide(policy, c.host)).toEqual({ action: c.action, ruleId: c.rule_id });
      });
    }
  }
});
