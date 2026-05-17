import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.AUTH_SECRET || "ai-drama-secret-key-123456";

export interface TokenPayload {
  userId: number;
  username: string;
  exp: number; // Expiration timestamp in milliseconds
}

function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64urlDecode(str: string): string {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64").toString("utf8");
}

/**
 * 签名生成 Token
 */
export function signToken(payload: Omit<TokenPayload, "exp">, expiresInSeconds = 7 * 24 * 60 * 60): string {
  const fullPayload: TokenPayload = {
    ...payload,
    exp: Date.now() + expiresInSeconds * 1000,
  };
  const payloadStr = base64urlEncode(JSON.stringify(fullPayload));
  const hmac = createHmac("sha256", SECRET);
  hmac.update(payloadStr);
  const signature = base64urlEncode(hmac.digest("base64"));
  return `${payloadStr}.${signature}`;
}

/**
 * 校验 Token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [payloadStr, signature] = parts;

    const hmac = createHmac("sha256", SECRET);
    hmac.update(payloadStr);
    const expectedSignature = base64urlEncode(hmac.digest("base64"));

    const sigBuffer = Buffer.from(signature);
    const expSigBuffer = Buffer.from(expectedSignature);
    if (sigBuffer.length !== expSigBuffer.length || !timingSafeEqual(sigBuffer, expSigBuffer)) {
      return null;
    }

    const payload = JSON.parse(base64urlDecode(payloadStr)) as TokenPayload;
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
