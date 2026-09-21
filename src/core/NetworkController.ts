import Peer, { DataConnection } from "peerjs";
import * as THREE from "three";
import type { InputFrame } from "./InputController";

/** Serialisable snapshot of a single input frame sent over the wire. */
interface NetInputFrame {
  mx: number;
  my: number;
  sp: boolean;
  pa: boolean;
  th: boolean;
  sw: boolean;
  re: boolean;
  ta: boolean;
  sh: boolean;
  shP: boolean;
  shR: boolean;
}

export type NetworkRole = "host" | "guest";

export class NetworkController {
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private _role: NetworkRole = "host";
  private _connected = false;
  private _sessionId = "";

  /** Latest input frame received from the remote player. */
  readonly remoteInput: InputFrame = createEmptyInput();

  /** Callbacks */
  onConnected: (() => void) | null = null;
  onDisconnected: (() => void) | null = null;
  onError: ((message: string) => void) | null = null;

  get role(): NetworkRole {
    return this._role;
  }

  get connected(): boolean {
    return this._connected;
  }

  get sessionId(): string {
    return this._sessionId;
  }

  /** Host creates a session and waits for a guest. Returns the session ID. */
  createSession(): Promise<string> {
    return new Promise((resolve, reject) => {
      const id = generateSessionId();
      this._role = "host";

      this.peer = new Peer(`soccer-${id}`, { debug: 0 });

      this.peer.on("open", () => {
        this._sessionId = id;
        resolve(id);
      });

      this.peer.on("connection", (conn) => {
        if (this.connection || this._connected) {
          conn.on("open", () => {
            conn.send({ type: "session-full" });
            conn.close();
          });
          return;
        }
        this.connection = conn;
        this.setupConnection(conn);
      });

      this.peer.on("error", (err) => {
        reject(err.message ?? "Failed to create session");
      });
    });
  }

  /** Guest joins an existing session by ID. */
  joinSession(sessionId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this._role = "guest";
      this._sessionId = sessionId;

      this.peer = new Peer(undefined as unknown as string, { debug: 0 });

      this.peer.on("open", () => {
        const conn = this.peer!.connect(`soccer-${sessionId}`, {
          reliable: false
        });

        this.connection = conn;
        this.setupConnection(conn);

        conn.on("open", () => {
          resolve();
        });

        conn.on("error", (err) => {
          reject(err.message ?? "Failed to join session");
        });
      });

      this.peer.on("error", (err) => {
        reject(err.message ?? "Connection error");
      });
    });
  }

  /** Send local input to the remote peer. */
  sendInput(input: InputFrame): void {
    if (!this.connection || !this._connected) return;

    const payload: NetInputFrame = {
      mx: Math.round(input.move.x * 1000) / 1000,
      my: Math.round(input.move.y * 1000) / 1000,
      sp: input.sprint,
      pa: input.passPressed,
      th: input.throughPressed,
      sw: input.switchPressed,
      re: input.restartPressed,
      ta: input.tacklePressed,
      sh: input.shootHeld,
      shP: input.shootPressed,
      shR: input.shootReleased
    };

    this.connection.send(payload);
  }

  dispose(): void {
    this.connection?.close();
    this.peer?.destroy();
    this.connection = null;
    this.peer = null;
    this._connected = false;
    this._sessionId = "";
  }

  private setupConnection(conn: DataConnection): void {
    conn.on("open", () => {
      this._connected = true;
      this.onConnected?.();
    });

    conn.on("data", (data) => {
      if (isSessionFullMessage(data)) {
        this._connected = false;
        this.connection = null;
        this.onError?.("This session already has another player.");
        conn.close();
        return;
      }
      const frame = data as NetInputFrame;
      this.remoteInput.move.set(frame.mx, frame.my);
      this.remoteInput.sprint = frame.sp;
      this.remoteInput.passPressed = frame.pa;
      this.remoteInput.throughPressed = frame.th;
      this.remoteInput.switchPressed = frame.sw;
      this.remoteInput.restartPressed = frame.re;
      this.remoteInput.tacklePressed = frame.ta;
      this.remoteInput.shootHeld = frame.sh;
      this.remoteInput.shootPressed = frame.shP;
      this.remoteInput.shootReleased = frame.shR;
    });

    conn.on("close", () => {
      this._connected = false;
      this.onDisconnected?.();
    });

    conn.on("error", () => {
      this._connected = false;
      this.onError?.("Connection lost");
    });
  }
}

function isSessionFullMessage(data: unknown): data is { type: "session-full" } {
  return typeof data === "object" && data !== null && (data as { type?: unknown }).type === "session-full";
}

function generateSessionId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 5; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

function createEmptyInput(): InputFrame {
  return {
    move: new THREE.Vector2(),
    sprint: false,
    passPressed: false,
    throughPressed: false,
    switchPressed: false,
    restartPressed: false,
    tacklePressed: false,
    shootHeld: false,
    shootPressed: false,
    shootReleased: false,
    pausePressed: false
  };
}
