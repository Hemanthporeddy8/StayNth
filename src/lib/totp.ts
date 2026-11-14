// RFC 6238 Time-Based One-Time Password (TOTP) pure Web Crypto implementation
// Zero external dependencies - works in all modern browsers and Node environments.

const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(base32: string): Uint8Array {
  const clean = base32.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  let index = 0;
  const output = new Uint8Array(Math.floor((clean.length * 5) / 8));

  for (let i = 0; i < clean.length; i++) {
    const val = BASE32_CHARS.indexOf(clean[i]);
    if (val === -1) continue;
    value = (value << 5) | val;
    bits += 5;
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }
  return output;
}

export function generateTOTPSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    result += BASE32_CHARS[bytes[i] % 32];
  }
  return result;
}

export function getTOTPAuthUri(email: string, secret: string, issuer = "StayNth"): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

export async function generateTOTPCode(secret: string, timeStepWindow = 0): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / 30) + timeStepWindow;
  const keyBytes = base32Decode(secret);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes as any,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );

  // Counter to 8-byte big endian buffer
  const counterBuffer = new ArrayBuffer(8);
  const counterView = new DataView(counterBuffer);
  counterView.setBigUint64(0, BigInt(counter), false);

  const signature = await crypto.subtle.sign("HMAC", key, counterBuffer);
  const signatureBytes = new Uint8Array(signature);

  // Dynamic truncation
  const offset = signatureBytes[signatureBytes.length - 1] & 0x0f;
  const code =
    ((signatureBytes[offset] & 0x7f) << 24) |
    ((signatureBytes[offset + 1] & 0xff) << 16) |
    ((signatureBytes[offset + 2] & 0xff) << 8) |
    (signatureBytes[offset + 3] & 0xff);

  const otp = (code % 1000000).toString().padStart(6, "0");
  return otp;
}

export async function verifyTOTP(token: string, secret: string): Promise<boolean> {
  const cleanToken = token.trim().replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanToken)) return false;

  // Check current window, -1 window, and +1 window (drift allowance +-30s)
  for (const drift of [0, -1, 1]) {
    const expected = await generateTOTPCode(secret, drift);
    if (expected === cleanToken) return true;
  }
  return false;
}
