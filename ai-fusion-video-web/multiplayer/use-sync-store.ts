"use client";

import { useSync, type RemoteTLStoreWithStatus } from "@tldraw/sync";
import { computed } from "tldraw";

const SYNC_PORT = process.env.NEXT_PUBLIC_SYNC_PORT || "5847";

function getUserId(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem("tldraw_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("tldraw_user_id", id);
  }
  return id;
}

function getUserName(): string {
  if (typeof window === "undefined") return "Anonymous";
  try {
    const stored = localStorage.getItem("auth-storage");
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed?.state?.user?.nickname || parsed?.state?.user?.username || "User";
    }
  } catch {}
  return "User";
}

const USER_COLORS = [
  "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4",
  "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F",
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

const currentUserId = getUserId();
const currentUserName = getUserName();
const currentUserColor = getUserColor(currentUserId);

/**
 * 初始化多人同步房间（将本地画布状态推送到 sync server）
 */
export async function initSyncRoom(
  roomId: string,
  snapshot: any
): Promise<void> {
  try {
    await fetch(
      `http://localhost:${SYNC_PORT}/init-room?roomId=${encodeURIComponent(roomId)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
      }
    );
  } catch (err) {
    console.warn("[sync] init-room failed (server may be offline):", err);
  }
}

/**
 * 多人同步画布 Hook
 *
 * 连接到 sync server，返回 synced store。
 * 当 status 为 'synced-remote' 时，将 store 传给 <Tldraw store={store.store}>。
 */
export function useSyncCanvasStore(roomId: string | null): RemoteTLStoreWithStatus {
  const uri = roomId
    ? `ws://localhost:${SYNC_PORT}/?roomId=${encodeURIComponent(roomId)}`
    : null;

  // 当 roomId 为 null 时，返回 disconnected 状态
  const result = useSync({
    uri: uri!,
    assets: {
      resolve: (asset: any) => {
        const src = asset.src;
        if (typeof src === "string") {
          return src.startsWith("http") ? src
            : src.startsWith("/") ? `${process.env.NEXT_PUBLIC_API_BASE_URL || ""}${src}`
            : src;
        }
        return src;
      },
      upload: async (_asset: any, _file: File): Promise<{ src: string }> => {
        // 使用 base64 内联存储多用户间的图片
        // 生产环境应替换为文件上传服务
        return { src: _asset.props.src as string };
      },
    },
    users: {
      currentUser: computed("currentUser", () => ({
        id: currentUserId as any,
        name: currentUserName,
        color: currentUserColor,
        imageUrl: "",
        meta: {},
        typeName: "user" as const,
      })) as any,
    },
    getUserPresence: (store: any, user: any) => {
      const camera = store?.getInstanceState()?.camera ?? { x: 0, y: 0, z: 1 };
      return {
        userId: user.id,
        userName: user.name,
        currentPageId: store?.getCurrentPageId() ?? "page:page",
        cursor: { x: camera.x, y: camera.y, type: "default", rotation: 0 },
        color: currentUserColor,
        followingUserId: null,
        brush: null,
        scribbles: [],
        screenBounds: { x: 0, y: 0, w: 1920, h: 1080 },
        activeToolId: "select",
        chatMessage: "",
        meta: {},
      };
    },
  });

  return result;
}
