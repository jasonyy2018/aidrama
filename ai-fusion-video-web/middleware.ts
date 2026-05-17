import { NextRequest } from "next/server";
import { proxy } from "./proxy";

export function middleware(request: NextRequest) {
  return proxy(request);
}

export const config = {
  matcher: [
    // 匹配所有路径，除了静态文件和图标
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
