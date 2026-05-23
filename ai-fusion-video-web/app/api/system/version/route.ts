import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/server";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/system/version
 * 检查当前系统版本和线上最新发布版本
 */
export async function GET(req: NextRequest) {
  try {
    // 权限校验：仅允许登录用户查看系统版本
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
    let latestVersion = "0.5.1";
    let latestReleaseUrl = "https://github.com/jasonyy2018/aidrama/releases";
    let publishedAt: string | null = null;
    let checkSucceeded = true;
    let message = "当前版本已是最新";

    // 获取前端传入的 force 参数（强制刷新）
    const { searchParams } = new URL(req.url);
    const force = searchParams.get("force") === "true";

    try {
      // 从 GitHub 获取最新 Release 信息
      const response = await fetch("https://api.github.com/repos/jasonyy2018/aidrama/releases/latest", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AI-Drama-Video-Updater",
        },
        next: force ? { revalidate: 0 } : { revalidate: 3600 }, // 如果是强制刷新，则不使用缓存，否则缓存 1 小时
      });

      if (response.ok) {
        const data = await response.json();
        const tag = data.tag_name; // 例如 "v0.5.2" 或 "0.5.2"
        if (tag) {
          latestVersion = tag.replace(/^v/, "");
          latestReleaseUrl = data.html_url || latestReleaseUrl;
          publishedAt = data.published_at || null;
        }
      } else {
        logger.warn(`GitHub API 返回错误状态码: ${response.status}`);
        checkSucceeded = false;
        message = "无法获取最新版本信息";
      }
    } catch (err) {
      logger.error("从 GitHub 检查最新版本时遭遇网络异常", err);
      checkSucceeded = false;
      message = "检查最新版本网络超时，已使用默认或缓存数据";
    }

    // 版本比对
    const currentVerParts = currentVersion.split(".").map(Number);
    const latestVerParts = latestVersion.split(".").map(Number);

    let versionRelation: "behind" | "same" | "ahead" | "incomparable" = "same";
    let updateAvailable = false;

    if (
      currentVerParts.length === 3 &&
      latestVerParts.length === 3 &&
      !currentVerParts.some(Number.isNaN) &&
      !latestVerParts.some(Number.isNaN)
    ) {
      for (let i = 0; i < 3; i++) {
        if (currentVerParts[i] < latestVerParts[i]) {
          versionRelation = "behind";
          updateAvailable = true;
          break;
        } else if (currentVerParts[i] > latestVerParts[i]) {
          versionRelation = "ahead";
          break;
        }
      }
    } else {
      versionRelation = "incomparable";
    }

    const versionData = {
      currentVersion,
      currentVersionDisplay: `v${currentVersion}`,
      latestVersion,
      latestVersionDisplay: `v${latestVersion}`,
      latestReleaseVersion: latestVersion,
      latestReleaseVersionDisplay: `v${latestVersion}`,
      latestReleaseUrl,
      latestReleasePublishedAt: publishedAt,
      latestReleaseDockerReady: true,
      updateAvailable,
      comparisonEnabled: true,
      developmentBuild: false,
      buildProfile: "production",
      versionRelation,
      releaseUrl: latestReleaseUrl,
      tagUrl: `https://github.com/jasonyy2018/aidrama/tags`,
      publishedAt,
      checkedAt: new Date().toISOString(),
      source: "github",
      checkSucceeded,
      message: updateAvailable ? `发现新版本 v${latestVersion}，请及时更新。` : message,
    };

    return NextResponse.json({
      code: 0,
      msg: "success",
      data: versionData,
    });
  } catch (err) {
    logger.error("获取系统版本信息发生严重错误", err);
    return NextResponse.json(
      {
        code: 500,
        msg: "服务器内部错误，获取版本失败",
        data: null,
      },
      { status: 500 }
    );
  }
}
