import { describe, expect, it } from "vitest";
import { toBahrainE164 } from "./whatsapp";

describe("toBahrainE164", () => {
  it.each([
    ["36699034", "+97336699034"],        // bare 8-digit local
    ["+97336699034", "+97336699034"],     // already E.164
    ["97336699034", "+97336699034"],      // country code, no +
    ["0097336699034", "+97336699034"],    // 00 international prefix
    ["973 3669 9034", "+97336699034"],    // spaces
    ["3669-9034", "+97336699034"],        // dashes
    ["+973 36699034", "+97336699034"],    // + and space
  ])("normalises %s -> %s", (input, expected) => {
    expect(toBahrainE164(input)).toBe(expected);
  });

  it.each(["", undefined, "12", "abc"])("returns undefined for unusable %s", (v) => {
    expect(toBahrainE164(v as string)).toBeUndefined();
  });
});
