import "server-only";
import { headers, cookies } from "next/headers";
import { verifyToken } from "./token";
import { redirect } from "next/navigation";

export interface CustomSession {
  userId: number;
  username: string;
  accessToken: string;
}

/**
 * 获取当前 Token
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const reqHeaders = await headers();
    const authHeader = reqHeaders.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
    const reqCookies = await cookies();
    const tokenCookie = reqCookies.get("auth-token")?.value;
    return tokenCookie ?? null;
  } catch {
    return null;
  }
}

/**
 * 获取当前会话，未登录时抛出错误（供 Route Handlers 使用）
 */
export async function requireSession(): Promise<CustomSession> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error("UNAUTHORIZED");
  }
  const payload = verifyToken(token);
  if (!payload) {
    throw new Error("UNAUTHORIZED");
  }
  return {
    userId: payload.userId,
    username: payload.username,
    accessToken: token,
  };
}

/**
 * 获取当前用户 ID，未登录时重定向到登录页（供 Server Actions/Pages 使用）
 */
export async function requireUserId(): Promise<number> {
  const token = await getAccessToken();
  if (!token) {
    redirect("/login");
  }
  const payload = verifyToken(token);
  if (!payload) {
    redirect("/login");
  }
  return payload.userId;
}

/**
 * 从 Request 中提取并验证 session（供 API Route Handlers 返回 401 使用）
 */
export async function getSessionFromRequest() {
  const token = await getAccessToken();
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  return {
    userId: payload.userId,
    username: payload.username,
    accessToken: token,
  };
}
