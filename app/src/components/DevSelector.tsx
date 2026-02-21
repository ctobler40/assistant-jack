import { useEffect, useMemo, useState } from "react";
import { EngineClient } from "../api/engineClient";
import type { EngineEvent } from "../api/engineClient";
import { matchRules } from "../rules/matcher";
import type { MatchResult, Rule } from "../rules/schema";
import rulesJson from "../../../data/rules/rules.json";

export default function DevSelector() {
  const [connected, setConnected] = useState(false);
  const [lastLine, setLastLine] = useState("");

  const rules = rulesJson as Rule[];
  const [matches, setMatches] = useState<MatchResult[]>([]);

  const client = useMemo(
    () =>
      new EngineClient({
        onOpen: () => setConnected(true),
        onClose: () => setConnected(false),
        onEvent: (evt) => {
          if (evt.type === "final_transcript") {
            setLastLine(evt.text);
            setMatches(matchRules(evt.text, rules));
          }
        },
      }),
    []
  );

  useEffect(() => {
    client.connect();
    return () => client.disconnect();
  }, [client]);

  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span>Engine: {connected ? "Connected" : "Disconnected"}</span>

        <button onClick={() => client.send({ type: "cmd_test_phrase", text: "what do you like doing in your free time?" })}>
          Send Test Phrase
        </button>

        <button onClick={() => client.send({ type: "cmd_start_listening" })}>Start</button>
        <button onClick={() => client.send({ type: "cmd_stop_listening" })}>Stop</button>

        <span style={{ marginLeft: 12 }}>Last: {lastLine}</span>
      </div>

      <div style={{ marginTop: 8 }}>
        {matches.length === 0 ? (
          <div>No rule matches.</div>
        ) : (
          <div>
            <div><b>Matched Rules:</b> {matches.map(m => m.rule.id).join(", ")}</div>
            <ul>
              {matches.map(m => (
                <li key={m.rule.id}>
                  <code>{m.rule.id}</code> → {m.rule.actions.map(a => a.type).join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}