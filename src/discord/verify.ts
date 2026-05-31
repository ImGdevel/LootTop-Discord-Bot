/**
 * Discord Interaction 요청 서명 검증
 *
 * Discord는 모든 Interaction 요청에 Ed25519 서명을 포함한다.
 * 검증 실패 시 401을 반환해야 한다.
 */
export async function verifyDiscordRequest(
  request: Request,
  publicKey: string
): Promise<{ valid: boolean; body: string }> {
  const signature = request.headers.get("x-signature-ed25519");
  const timestamp = request.headers.get("x-signature-timestamp");

  if (!signature || !timestamp) {
    return { valid: false, body: "" };
  }

  const body = await request.text();

  const isValid = await verifySignature(publicKey, signature, timestamp, body);

  return { valid: isValid, body };
}

async function verifySignature(
  publicKey: string,
  signature: string,
  timestamp: string,
  body: string
): Promise<boolean> {
  try {
    const publicKeyBytes = hexToUint8Array(publicKey);
    const signatureBytes = hexToUint8Array(signature);
    const message = new TextEncoder().encode(timestamp + body);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      publicKeyBytes,
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    return await crypto.subtle.verify("Ed25519", cryptoKey, signatureBytes, message);
  } catch {
    return false;
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}
