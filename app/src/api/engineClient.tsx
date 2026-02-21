export type EngineEvent =
  | { type: "status"; connected?: boolean; listening?: boolean; message?: string }
  | { type: "partial_transcript"; text: string }
  | { type: "final_transcript"; text: string }
  | { type: "error"; message: string };

export type EngineCommand =
  | { type: "cmd_start_listening"; deviceId?: string }
  | { type: "cmd_stop_listening" }
  | { type: "cmd_test_phrase"; text: string };

type Handlers = {
  onEvent?: (evt: EngineEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: unknown) => void;
};

export class EngineClient {
  private ws: WebSocket | null = null;
  private handlers: Handlers;

  constructor(handlers: Handlers = {}) {
    this.handlers = handlers;
  }

  connect(url = "ws://localhost:5055/ws") {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.handlers.onOpen?.();
    };

    this.ws.onmessage = (msg) => {
      try {
        const evt = JSON.parse(msg.data) as EngineEvent;
        this.handlers.onEvent?.(evt);
      } catch (e) {
        this.handlers.onEvent?.({ type: "error", message: "Bad event from engine (non-JSON)" });
      }
    };

    this.ws.onclose = () => {
      this.handlers.onClose?.();
      this.ws = null;
    };

    this.ws.onerror = (e) => {
      this.handlers.onError?.(e);
    };
  }

  disconnect() {
    if (!this.ws) return;
    this.ws.close();
    this.ws = null;
  }

  send(cmd: EngineCommand) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(cmd));
  }
}