export type MatchSpec =
  | {
      type: "contains";
      value: string;
      caseSensitive?: boolean;
    }
  | {
      type: "regex";
      value: string; // JS regex source, no /slashes/
      flags?: string; // e.g. "i"
    };

export type Action =
  | { type: "open_url"; url: string }
  | { type: "open_file"; path: string }
  | { type: "create_notes_doc"; template: string; outputDir: string }
  | { type: "run_ahk"; script: string; args?: string[] };

export type Rule = {
  id: string;
  enabled: boolean;
  match: MatchSpec;
  cooldownMs?: number; // optional UI-side (engine will enforce later)
  actions: Action[];
};

export type MatchResult = {
  rule: Rule;
  matchedText?: string;
};