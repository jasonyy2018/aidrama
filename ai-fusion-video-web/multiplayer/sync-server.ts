/**
 * 画布多人同步服务器
 *
 * 使用 @tldraw/sync 的 InMemorySyncStorage + TLSocketRoom 管理房间和 WebSocket 连接。
 * 独立的进程，可与其他 sync server 或云服务互换。
 *
 * 房间 ID 使用 projectId 作为前缀（e.g. "project_42"）。
 * 提供 HTTP REST 接口用于初始化房间初始状态。
 *
 * 启动（开发）：
 *   npx tsx multiplayer/sync-server.ts
 *
 * 启动（生产）：
 *   node multiplayer/sync-server.js
 */

// @ts-nocheck - @tldraw/sync-core types excluded from release
import { InMemorySyncStorage, TLSocketRoom } from "@tldraw/sync";
import { createServer } from "http";
import WebSocket from "ws";
import * as fs from "fs";
import * as path from "path";

const PORT = parseInt(process.env.SYNC_PORT || "5847", 10);
const DATA_DIR = process.env.SYNC_DATA_DIR || path.join(process.cwd(), ".sync-data");

function roomFilePath(roomId: string): string {
  return path.join(DATA_DIR, `${encodeURIComponent(roomId)}.json`);
}

function loadSnapshot(roomId: string) {
  try {
    const file = roomFilePath(roomId);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch (err) {
    console.error(`[sync] Failed to load snapshot for room ${roomId}:`, err);
    return null;
  }
}

const saveQueues = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleSave(
  roomId: string,
  storage: { getSnapshot(): unknown }
) {
  if (saveQueues.has(roomId)) clearTimeout(saveQueues.get(roomId)!);
  saveQueues.set(
    roomId,
    setTimeout(() => {
      try {
        const data = storage.getSnapshot();
        const file = roomFilePath(roomId);
        const dir = path.dirname(file);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(data), "utf-8");
      } catch (err) {
        console.error(`[sync] Failed to save room ${roomId}:`, err);
      }
      saveQueues.delete(roomId);
    }, 5000)
  );
}

const rooms = new Map<string, { room: any; storage: { getSnapshot(): unknown } }>();

async function getOrCreateRoom(roomId: string) {
  let entry = rooms.get(roomId);
  if (entry) return entry;

  const existing = loadSnapshot(roomId);
  const storage = new InMemorySyncStorage({
    snapshot: existing ?? undefined,
  });

  const room = new TLSocketRoom({
    storage,
    clientTimeout: 30000,
    onSessionRemoved: (_rm: any, args: { numSessionsRemaining: number }) => {
      if (args.numSessionsRemaining === 0) {
        scheduleSave(roomId, storage);
        setTimeout(() => {
          rooms.delete(roomId);
          console.log(`[sync] Room closed: ${roomId}`);
        }, 10000);
      }
    },
  });

  entry = { room, storage };
  rooms.set(roomId, entry);
  console.log(`[sync] Room created: ${roomId}`);
  return entry;
}

async function handleInitRoom(req: any, body: string): Promise<number> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const roomId = url.searchParams.get("roomId");
  if (!roomId) return 400;

  const existing = loadSnapshot(roomId);
  if (existing) return 200;

  try {
    const snapshot = JSON.parse(body);
    const storage = new InMemorySyncStorage({ snapshot });
    const room = new TLSocketRoom({
      storage,
      clientTimeout: 30000,
      onSessionRemoved: (_rm: any, args: { numSessionsRemaining: number }) => {
        if (args.numSessionsRemaining === 0) {
          scheduleSave(roomId, storage);
          setTimeout(() => rooms.delete(roomId), 10000);
        }
      },
    });
    const old = rooms.get(roomId);
    if (old) old.room.close();
    rooms.set(roomId, { room, storage });
    scheduleSave(roomId, storage);
    console.log(`[sync] Room initialized from snapshot: ${roomId}`);
    return 200;
  } catch (err) {
    console.error(`[sync] Init room failed:`, err);
    return 400;
  }
}

const httpServer = createServer((req: any, res: any) => {
  if (req.method === "POST" && req.url?.startsWith("/init-room")) {
    let body = "";
    req.on("data", (chunk: string) => (body += chunk));
    req.on("end", async () => {
      const status = await handleInitRoom(req, body);
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status }));
    });
    return;
  }
  res.writeHead(404);
  res.end("Not Found");
});

const wss = new WebSocket.Server({ server: httpServer });

wss.on("connection", async (ws: any, req: any) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const roomId = url.searchParams.get("roomId");
  if (!roomId) {
    ws.close(4000, "Missing roomId");
    return;
  }

  const { room } = await getOrCreateRoom(roomId);
  const sessionId = crypto.randomUUID();

  const socket = {
    readyState: ws.readyState as number,
    send: (data: string) => { if (ws.readyState === ws.OPEN) ws.send(data); },
    close: (code?: number, reason?: string) => ws.close(code, reason),
    addEventListener: (type: string, listener: (event: any) => void) => {
      if (type === "message") ws.on("message", listener);
      else if (type === "close") ws.on("close", listener);
      else if (type === "error") ws.on("error", listener);
    },
    removeEventListener: (type: string, listener: (event: any) => void) => {
      if (type === "message") ws.off("message", listener);
      else if (type === "close") ws.off("close", listener);
      else if (type === "error") ws.off("error", listener);
    },
  };

  room.handleSocketConnect({ sessionId, socket });

  ws.on("close", () => room.handleSocketClose(sessionId));
  ws.on("error", () => room.handleSocketError(sessionId));
});

httpServer.listen(PORT, () => {
  console.log(`[sync] Server listening on ws://localhost:${PORT}`);
  console.log(`[sync] Init endpoint: POST http://localhost:${PORT}/init-room?roomId=<id>`);
});
