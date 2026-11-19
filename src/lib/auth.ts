const encoder = new TextEncoder();

export const AUTH_COOKIE_NAME = "portfolio_access";
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function isAuthEnabled() {
  return process.env.PORTFOLIO_AUTH_ENABLED !== "false";
}

export function isAuthConfigured() {
  return Boolean(process.env.PORTFOLIO_PASSWORD && process.env.AUTH_SECRET);
}

async function digest(value: string) {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", encoder.encode(value)),
  );
}

export async function secureCompare(left: string, right: string) {
  const [leftDigest, rightDigest] = await Promise.all([
    digest(left),
    digest(right),
  ]);

  let difference = 0;

  for (let index = 0; index < leftDigest.length; index += 1) {
    difference |= leftDigest[index] ^ rightDigest[index];
  }

  return difference === 0;
}

export async function createSessionToken() {
  const password = process.env.PORTFOLIO_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!password || !secret) {
    return null;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`portfolio-access-v1:${password}`),
  );

  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

export async function isValidSession(token?: string) {
  if (!token) {
    return false;
  }

  const expectedToken = await createSessionToken();
  return expectedToken ? secureCompare(token, expectedToken) : false;
}
