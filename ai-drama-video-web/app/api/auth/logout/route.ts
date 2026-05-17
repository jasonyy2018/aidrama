import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/logout
 * 退出登录
 */
export async function POST() {
  logger.info("用户发起退出登录");
  
  const response = NextResponse.json({
    code: 0,
    msg: "success",
    data: true,
  });

  // 清除 auth-token 浏览器 Cookie
  response.cookies.set("auth-token", "", { maxAge: 0, path: "/" });
  logger.info("退出登录成功，已清除相关 Cookie");

  return response;
}
