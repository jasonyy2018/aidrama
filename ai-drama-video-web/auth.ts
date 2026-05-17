import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

const JAVA_API_BASE_URL =
  process.env.JAVA_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:18080";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "用户名", type: "text" },
        password: { label: "密码", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        try {
          const resp = await fetch(`${JAVA_API_BASE_URL}/api/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          });

          if (!resp.ok) return null;

          const json = await resp.json();
          if (json.code !== 0 || !json.data) return null;

          const data = json.data as {
            accessToken: string;
            refreshToken: string;
            expiresIn: number;
            userId: number;
            username: string;
            nickname: string;
          };

          return {
            id: String(data.userId),
            name: data.nickname || data.username,
            email: data.username, // next-auth 需要 email 字段，这里复用 username
            // 扩展字段
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            expiresIn: data.expiresIn,
            userId: data.userId,
            username: data.username,
            nickname: data.nickname,
          };
        } catch {
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // 初次登录时将 user 数据写入 JWT token
      if (user) {
        token.accessToken = (user as Record<string, unknown>).accessToken as string;
        token.refreshToken = (user as Record<string, unknown>).refreshToken as string;
        token.userId = (user as Record<string, unknown>).userId as number;
        token.username = (user as Record<string, unknown>).username as string;
        token.nickname = (user as Record<string, unknown>).nickname as string;
        token.accessTokenExpiry =
          Date.now() + ((user as Record<string, unknown>).expiresIn as number) * 1000;
      }

      // Token 刷新：Java 后端 JWT 过期前 5 分钟自动刷新
      if (token.accessTokenExpiry && Date.now() > (token.accessTokenExpiry as number) - 5 * 60 * 1000) {
        try {
          const resp = await fetch(`${JAVA_API_BASE_URL}/api/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken: token.refreshToken }),
          });
          if (resp.ok) {
            const json = await resp.json();
            if (json.code === 0 && json.data) {
              token.accessToken = json.data.accessToken;
              token.refreshToken = json.data.refreshToken;
              token.accessTokenExpiry = Date.now() + json.data.expiresIn * 1000;
            }
          }
        } catch {
          // 刷新失败时保持原 token，让客户端处理 401
        }
      }

      return token;
    },

    async session({ session, token }) {
      // 将 JWT token 中的扩展字段暴露给客户端 session
      session.user.id = token.userId as unknown as string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = session as unknown as Record<string, unknown>;
      s.accessToken = token.accessToken;
      s.userId = token.userId;
      s.username = token.username;
      s.nickname = token.nickname;
      return session;
    },
  },

  pages: {
    signIn: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 天
  },

  // 与 Java 后端 JWT 共用 secret（从环境变量读取）
  secret: process.env.AUTH_SECRET,
});
