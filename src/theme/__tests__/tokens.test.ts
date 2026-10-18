import { expect, test } from "@jest/globals";
import { dark, light } from "../tokens";

test("light and dark palettes define the same tokens as hex colours", () => {
  expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  for (const value of [...Object.values(light), ...Object.values(dark)]) {
    expect(value).toMatch(/^#[0-9A-F]{6}$/);
  }
});
