import type { TokenPayload } from '../types';

/**
 * Generate a signed token using Web Crypto API
 */
export async function generateToken(
  payload: Omit<TokenPayload, 'exp'>,
  secret: string,
  expiresInHours: number = 24
): Promise<string> {
  const data: TokenPayload = {
    ...payload,
    exp: Date.now() + expiresInHours * 60 * 60 * 1000,
  };

  const json = JSON.stringify(data);
  const encoder = new TextEncoder();

  // Import key for HMAC-SHA256
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign the payload
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(json));

  // Convert signature to hex string
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Return base64(payload).signature
  return btoa(json) + '.' + signature;
}

/**
 * Verify and decode a token using Web Crypto API
 */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const [dataB64, signature] = token.split('.');
    if (!dataB64 || !signature) return null;

    const json = atob(dataB64);
    const encoder = new TextEncoder();

    // Import key for HMAC-SHA256
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    // Compute expected signature
    const expectedBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(json));
    const expectedSig = Array.from(new Uint8Array(expectedBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Compare signatures
    if (signature !== expectedSig) return null;

    const data = JSON.parse(json) as TokenPayload;

    // Check expiration
    if (data.exp < Date.now()) return null;

    return data;
  } catch {
    return null;
  }
}
