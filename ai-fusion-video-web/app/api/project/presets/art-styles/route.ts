import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ART_STYLE_PRESETS = [
  {
    key: "anime",
    name: "日漫二次元",
    description: "经典日系动漫风格，色彩明快，线条清晰，适合青春、科幻题材",
    imagePrompt: "anime style, colorful, highly detailed, expressive eyes, clear line art, Japanese animation aesthetic",
    referenceImagePath: "/media/presets/anime.png",
    referenceImagePublicUrl: "/media/presets/anime.png",
  },
  {
    key: "3d-cartoon",
    name: "3D 卡通",
    description: "类似皮克斯/迪士尼的 3D 动画风格，角色生动立体",
    imagePrompt: "3d cartoon style, pixar style, disney style, cute, smooth textures, warm lighting, vibrant colors",
    referenceImagePath: "/media/presets/3d-cartoon.png",
    referenceImagePublicUrl: "/media/presets/3d-cartoon.png",
  },
  {
    key: "cinematic",
    name: "写实电影",
    description: "逼真的电影画质与光影，细节丰富，极具叙事张力",
    imagePrompt: "cinematic style, realistic, 8k resolution, dramatic lighting, photorealistic, depth of field, detailed textures",
    referenceImagePath: "/media/presets/cinematic.png",
    referenceImagePublicUrl: "/media/presets/cinematic.png",
  },
  {
    key: "ink-wash",
    name: "国风水墨",
    description: "传统水墨画意境，留白写意，典雅深邃",
    imagePrompt: "chinese ink wash painting style, elegant, abstract watercolor, traditional brush strokes, minimal color palette, zen atmosphere",
    referenceImagePath: "/media/presets/ink-wash.png",
    referenceImagePublicUrl: "/media/presets/ink-wash.png",
  },
  {
    key: "cyberpunk",
    name: "赛博朋克",
    description: "霓虹闪烁的未来都市风格，科技感与街头感交织",
    imagePrompt: "cyberpunk style, neon lights, futuristic city, high tech low life, dark streets, reflection on wet ground, holographic projections",
    referenceImagePath: "/media/presets/cyberpunk.png",
    referenceImagePublicUrl: "/media/presets/cyberpunk.png",
  },
];

/**
 * GET /api/project/presets/art-styles
 * 获取预设画风列表
 */
export async function GET() {
  return NextResponse.json({
    code: 0,
    msg: "success",
    data: ART_STYLE_PRESETS,
  });
}
