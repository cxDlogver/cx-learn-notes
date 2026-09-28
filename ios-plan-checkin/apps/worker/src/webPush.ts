import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  randomBytes,
  sign,
} from "node:crypto";
import { isIP } from "node:net";

const RECORD_SIZE = 4096;
const MAX_PLAINTEXT = 3993;
const suffixes = [
  "push.apple.com",
  "push.services.mozilla.com",
  "notify.windows.com",
];

function hmac(key: Uint8Array, data: Uint8Array): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

/** RFC 8291 / RFC 8188 single-record aes128gcm Web Push encoding. */
export function encodeWebPush(
  publicKey: Uint8Array,
  authSecret: Uint8Array,
  plaintext: Uint8Array,
  options: { salt?: Uint8Array; privateKey?: Uint8Array } = {},
): Buffer {
  if (publicKey.length !== 65 || publicKey[0] !== 4 || authSecret.length !== 16)
    throw new Error("Invalid Web Push subscription keys");
  if (plaintext.length > MAX_PLAINTEXT)
    throw new Error("Web Push plaintext exceeds one record");
  const salt = Buffer.from(options.salt ?? randomBytes(16));
  if (salt.length !== 16) throw new Error("Invalid Web Push salt");
  const server = createECDH("prime256v1");
  if (options.privateKey) server.setPrivateKey(options.privateKey);
  else server.generateKeys();
  const senderPublic = server.getPublicKey();
  const shared = server.computeSecret(publicKey);
  const prkKey = hmac(authSecret, shared);
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0", "ascii"),
    publicKey,
    senderPublic,
    Buffer.from([1]),
  ]);
  const ikm = hmac(prkKey, keyInfo);
  const prk = hmac(salt, ikm);
  const cek = hmac(
    prk,
    Buffer.from("Content-Encoding: aes128gcm\0\x01", "ascii"),
  ).subarray(0, 16);
  const nonce = hmac(
    prk,
    Buffer.from("Content-Encoding: nonce\0\x01", "ascii"),
  ).subarray(0, 12);
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const record = Buffer.concat([
    cipher.update(Buffer.concat([plaintext, Buffer.from([2])])),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  const size = Buffer.alloc(4);
  size.writeUInt32BE(RECORD_SIZE);
  return Buffer.concat([
    salt,
    size,
    Buffer.from([senderPublic.length]),
    senderPublic,
    record,
  ]);
}

export function allowedWebPushEndpoint(endpoint: string): URL {
  const url = new URL(endpoint);
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.port ||
    url.username ||
    url.password ||
    url.hash ||
    isIP(hostname) !== 0 ||
    !(
      hostname === "fcm.googleapis.com" ||
      suffixes.some(
        (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
      )
    )
  )
    throw new Error("Unsupported Web Push endpoint origin");
  return url;
}

export class WebPushError extends Error {
  constructor(readonly status: number) {
    super(`Web Push provider status ${status}`);
  }
  get expired(): boolean {
    return this.status === 404 || this.status === 410;
  }
  get retryable(): boolean {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

export interface WebPushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export class WebPushSender {
  readonly publicKey: string;
  private readonly signingKey: ReturnType<typeof createPrivateKey>;
  private readonly subject: string;
  constructor(environment = process.env) {
    const privateBytes = Buffer.from(
      environment.VAPID_PRIVATE_KEY ?? "",
      "base64url",
    );
    const ecdh = createECDH("prime256v1");
    if (privateBytes.length !== 32)
      throw new Error("VAPID_PRIVATE_KEY must be 32 base64url bytes");
    ecdh.setPrivateKey(privateBytes);
    this.publicKey = ecdh.getPublicKey().toString("base64url");
    if (
      environment.VAPID_PUBLIC_KEY &&
      environment.VAPID_PUBLIC_KEY !== this.publicKey
    )
      throw new Error("VAPID public/private keys do not match");
    const publicBytes = ecdh.getPublicKey();
    this.signingKey = createPrivateKey({
      key: {
        kty: "EC",
        crv: "P-256",
        d: privateBytes.toString("base64url"),
        x: publicBytes.subarray(1, 33).toString("base64url"),
        y: publicBytes.subarray(33).toString("base64url"),
      },
      format: "jwk",
    });
    this.subject = environment.VAPID_SUBJECT ?? "";
    if (!/^(mailto:[^\s@]+@[^\s@]+|https:\/\/[^\s]+)$/.test(this.subject))
      throw new Error("VAPID_SUBJECT must be a mailto or HTTPS contact");
  }

  private authorization(origin: string): string {
    const base64 = (value: object) =>
      Buffer.from(JSON.stringify(value)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const head = base64({ typ: "JWT", alg: "ES256" });
    const body = base64({
      aud: origin,
      exp: now + 3600,
      sub: this.subject,
    });
    const input = `${head}.${body}`;
    const signature = sign("sha256", Buffer.from(input), {
      key: this.signingKey,
      dsaEncoding: "ieee-p1363",
    }).toString("base64url");
    return `vapid t=${input}.${signature}, k=${this.publicKey}`;
  }

  async send(
    subscription: WebPushSubscription,
    kind: "plan" | "social",
  ): Promise<void> {
    const url = allowedWebPushEndpoint(subscription.endpoint);
    const payload = Buffer.from(
      JSON.stringify({
        title: "计划打卡",
        body: kind === "plan" ? "有计划需要关注" : "收到新互动",
        path: kind === "plan" ? "/today" : "/inbox",
      }),
    );
    const encrypted = encodeWebPush(
      Buffer.from(subscription.p256dh, "base64url"),
      Buffer.from(subscription.auth, "base64url"),
      payload,
    );
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Authorization: this.authorization(url.origin),
          "Content-Encoding": "aes128gcm",
          "Content-Type": "application/octet-stream",
          TTL: "3600",
        },
        body: encrypted,
      });
    } catch {
      throw new WebPushError(0);
    }
    await response.body?.cancel();
    if (response.status !== 201 && response.status !== 202)
      throw new WebPushError(response.status);
  }
}
