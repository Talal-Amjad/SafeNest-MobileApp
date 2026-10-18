import { expect, test } from "@jest/globals";
import { countdown, formatCode, isCompleteCode } from "../code";

test("formatCode uppercases, strips junk and inserts the dash", () => {
  expect(formatCode("abcde")).toBe("ABCDE");
  expect(formatCode("abcdef")).toBe("ABCDE-F");
  expect(formatCode(" ab-cd e fghjk zz")).toBe("ABCDE-FGHJK");
  expect(isCompleteCode("ABCDE-FGHJK")).toBe(true);
  expect(isCompleteCode("ABCDE-FGHJ")).toBe(false);
});

test("countdown shows m:ss and null once expired", () => {
  const now = new Date("2026-10-18T12:00:00Z");
  expect(countdown("2026-10-18T12:15:00Z", now)).toBe("15:00");
  expect(countdown("2026-10-18T12:00:09Z", now)).toBe("0:09");
  expect(countdown("2026-10-18T12:00:00Z", now)).toBeNull();
});
