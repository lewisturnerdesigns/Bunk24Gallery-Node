import { createHmac, timingSafeEqual } from "node:crypto";
import { UnauthorizedException } from "@nestjs/common";

type AdminClaims = { sub: string; exp: number };

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function signAdminToken(email: string) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET must be set to a random secret of at least 32 characters.");
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ sub: email, exp: Math.floor(Date.now() / 1000) + Number(process.env.JWT_EXPIRE_MINUTES || 60) * 60 })).toString("base64url");
  const unsigned = header + "." + payload;
  return unsigned + "." + createHmac("sha256", secret).update(unsigned).digest("base64url");
}

export function requireAdminToken(authorization?: string) {
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : "";
  const secret = process.env.JWT_SECRET;
  if (!token || !secret) throw new UnauthorizedException("Please sign in to continue.");
  const parts = token.split(".");
  if (parts.length !== 3) throw new UnauthorizedException("Your session has expired. Please sign in again.");
  const unsigned = parts[0] + "." + parts[1];
  const expected = createHmac("sha256", secret).update(unsigned).digest();
  let supplied: Buffer;
  try { supplied = Buffer.from(parts[2], "base64url"); } catch { throw new UnauthorizedException("Invalid session."); }
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new UnauthorizedException("Invalid session.");
  let claims: AdminClaims;
  try { claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as AdminClaims; } catch { throw new UnauthorizedException("Invalid session."); }
  if (!claims.sub || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000) || claims.sub !== process.env.ADMIN_EMAIL) {
    throw new UnauthorizedException("Your session has expired. Please sign in again.");
  }
  return claims.sub;
}

export function verifyAdminCredentials(email: string, password: string) {
  const configuredEmail = process.env.ADMIN_EMAIL || "";
  const configuredPassword = process.env.ADMIN_PASSWORD || "";
  return Boolean(configuredEmail && configuredPassword && safeEqual(email.trim().toLowerCase(), configuredEmail.trim().toLowerCase()) && safeEqual(password, configuredPassword));
}
