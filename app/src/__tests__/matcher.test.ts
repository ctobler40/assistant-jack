import { describe, it, expect } from "vitest";
import { matchRules } from "../rules/matcher";
import type { Rule } from "../rules/schema";

describe("matchRules", () => {
  it("matches contains (case-insensitive)", () => {
    const rules: Rule[] = [
      {
        id: "r1",
        enabled: true,
        match: { type: "contains", value: "free time", caseSensitive: false },
        actions: [{ type: "open_url", url: "https://example.com" }]
      }
    ];

    const res = matchRules("What do you like doing in your FREE time?", rules);
    expect(res.length).toBe(1);
    expect(res[0].rule.id).toBe("r1");
  });

  it("matches regex with flags", () => {
    const rules: Rule[] = [
      {
        id: "r2",
        enabled: true,
        match: { type: "regex", value: "(action items|next steps)", flags: "i" },
        actions: [{ type: "open_file", path: "C:/tmp/test.txt" }]
      }
    ];

    const res = matchRules("Ok, next steps are...", rules);
    expect(res.length).toBe(1);
    expect(res[0].matchedText?.toLowerCase()).toContain("next steps");
  });

  it("ignores disabled rules", () => {
    const rules: Rule[] = [
      {
        id: "r3",
        enabled: false,
        match: { type: "contains", value: "hello" },
        actions: [{ type: "open_url", url: "https://example.com" }]
      }
    ];

    const res = matchRules("hello", rules);
    expect(res.length).toBe(0);
  });
});