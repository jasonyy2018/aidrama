import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    userId?: number;
    username?: string;
    nickname?: string;
  }

  interface User {
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    userId?: number;
    username?: string;
    nickname?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    refreshToken?: string;
    accessTokenExpiry?: number;
    userId?: number;
    username?: string;
    nickname?: string;
  }
}
