import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ assetType: string }>;
}

/**
 * GET /api/asset/metadata/[assetType]
 * 获取特定资产类型的字段属性元数据
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  const { assetType } = await params;
  return NextResponse.json({
    code: 0,
    msg: "success",
    data: {
      assetType,
      fields: [],
    },
  });
}
