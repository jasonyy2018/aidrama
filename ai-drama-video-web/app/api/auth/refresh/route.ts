import { NextRequest, NextResponse } from "next/server";
import { verifyToken, signToken } from "@/lib/auth/token";
import { logger } from "@/lib/logger";

/**
 * POST /api/auth/refresh
 * 刷新 Token
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { refreshToken } = body;

    if (!refreshToken) {
      logger.warn("刷新 Token 失败：未提供 refreshToken");
      return NextResponse.json(
        {
          code: 400,
          msg: "未提供 Refresh Token",
          data: null,
        },
        { status: 400 }
      );
    }

    const payload = verifyToken(refreshToken);
    if (!payload) {
      logger.warn("刷新 Token 失败：Refresh Token 无效或已过期");
      return NextResponse.json(
        {
          code: 401,
          msg: "会话过期，请重新登录",
          data: null,
        },
        { status: 401 }
      );
    }

    const { userId, username } = payload;
    logger.info("执行 Token 刷新", { userId, username });

    const newAccessToken = signToken({ userId, username });
    const newRefreshToken = signToken({ userId, username }, 30 * 24 * 60 * 60);

    const loginResp = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 7 * 24 * 60 * 60,
      userId,
      username,
      nickname: username, // 简易返回，前端会接着请求 user-info 刷新更精确的信息
    };

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: loginResp,
    });
  } catch (err) {
    logger.error("刷新 Token 遭遇异常", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器错误，刷新失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
