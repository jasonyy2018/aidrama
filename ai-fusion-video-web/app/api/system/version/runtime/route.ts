import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/system/version/runtime
 * 获取当前系统的运行版本元数据
 */
export async function GET() {
  try {
    // 权限校验：仅允许登录用户查看
    try {
      await requireSession();
    } catch {
      return NextResponse.json(
        {
          code: 401,
          msg: "未登录，请先登录账号",
          data: null,
        },
        { status: 401 }
      );
    }

    const currentVersion = "0.5.1";
    const runtimeData = {
      currentVersion,
      currentVersionDisplay: `v${currentVersion}`,
      comparisonEnabled: true,
      developmentBuild: process.env.NODE_ENV === "development",
      buildProfile: process.env.NODE_ENV || "production",
      message: null,
    };

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: runtimeData,
    });
  } catch (err) {
    logger.error("获取运行环境版本失败", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器内部错误，获取运行版本失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
