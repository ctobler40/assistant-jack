import type { Rule, MatchResult } from "./schema";

function normalizeText(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export function matchRules(transcript: string, rules: Rule[]): MatchResult[] {
  const text = normalizeText(transcript);
  const results: MatchResult[] = [];

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const m = rule.match;

    if (m.type === "contains") {
      const hay = m.caseSensitive ? text : text.toLowerCase();
      const needle = m.caseSensitive ? m.value : m.value.toLowerCase();

      if (needle.length === 0) continue;
      if (hay.includes(needle)) {
        results.push({ rule, matchedText: m.value });
      }
      continue;
    }

    if (m.type === "regex") {
      if (!m.value) continue;
      const flags = m.flags ?? "";
      const re = new RegExp(m.value, flags);
      const match = re.exec(text);
      if (match) {
        results.push({ rule, matchedText: match[0] });
      }
      continue;
    }
  }

  return results;
}