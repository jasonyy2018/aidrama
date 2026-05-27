import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/asset/[id]/items
 * 获取资产的子项列表（目前数据库无子项表，返回空数组兼容）
 */
export async function GET() {
  return NextResponse.json({
    code: 0,
    msg: "success",
    data: [],
  });
}
