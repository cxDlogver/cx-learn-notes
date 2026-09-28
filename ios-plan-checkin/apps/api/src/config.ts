import { createHash } from "node:crypto";
import { Injectable } from "@nestjs/common";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

function secret(name: string, environment: string): Uint8Array {
  const value = required(name);
  if (
    environment !== "development" &&
    (value.length < 32 || value.startsWith("local_only_"))
  ) {
    throw new Error(
      `${name} must be an injected production secret of at least 32 characters.`,
    );
  }
  return createHash("sha256").update(value).digest();
}

@Injectable()
export class ApiConfig {
  readonly environment = required("APP_ENV");
  readonly databaseUrl = required("DATABASE_URL");
  readonly accessTokenKey = secret("ACCESS_TOKEN_SECRET", this.environment);
  readonly phoneEncryptionKey = secret(
    "PHONE_ENCRYPTION_KEY",
    this.environment,
  );
  readonly phoneLookupKey = secret("PHONE_LOOKUP_KEY", this.environment);
  readonly otpHashKey = secret("OTP_HASH_KEY", this.environment);
  readonly authIdempotencyKey = secret(
    "AUTH_IDEMPOTENCY_KEY",
    this.environment,
  );
  readonly pushTokenEncryptionKey = secret(
    "PUSH_TOKEN_ENCRYPTION_KEY",
    this.environment,
  );
  readonly smsProvider = required("SMS_PROVIDER");
  readonly smsGatewayUrl = process.env.SMS_GATEWAY_URL;
  readonly smsGatewayToken = process.env.SMS_GATEWAY_TOKEN;
  readonly objectEndpoint = required("OBJECT_ENDPOINT");
  readonly objectPublicEndpoint =
    process.env.OBJECT_PUBLIC_ENDPOINT ?? this.objectEndpoint;
  readonly objectBucket = required("OBJECT_BUCKET");
  readonly objectRegion = process.env.OBJECT_REGION ?? "us-east-1";
  readonly objectAccessKeyId = required("OBJECT_ACCESS_KEY_ID");
  readonly objectSecretAccessKey = required("OBJECT_SECRET_ACCESS_KEY");
  readonly metricsToken = process.env.API_METRICS_TOKEN ?? "";
  readonly webOrigin = process.env.WEB_ORIGIN;
  readonly vapidPublicKey = process.env.VAPID_PUBLIC_KEY ?? null;
  readonly trustProxyHops = Number(process.env.API_TRUST_PROXY_HOPS ?? "0");

  constructor() {
    if (!["development", "staging", "production"].includes(this.environment)) {
      throw new Error("APP_ENV must be development, staging or production.");
    }
    if (this.smsProvider === "stub" && this.environment !== "development") {
      throw new Error("Stub SMS provider is only permitted in development.");
    }
    if (
      this.smsProvider === "http" &&
      (!this.smsGatewayUrl || !this.smsGatewayToken)
    ) {
      throw new Error("HTTP SMS provider requires URL and token.");
    }
    if (!["stub", "http"].includes(this.smsProvider)) {
      throw new Error("Unsupported SMS_PROVIDER.");
    }
    if (
      this.environment !== "development" &&
      (!this.objectEndpoint.startsWith("https://") ||
        !this.objectPublicEndpoint.startsWith("https://"))
    )
      throw new Error(
        "Object storage endpoints must use HTTPS outside development.",
      );
    if (
      !Number.isInteger(this.trustProxyHops) ||
      this.trustProxyHops < 0 ||
      this.trustProxyHops > 2
    )
      throw new Error("API_TRUST_PROXY_HOPS must be an integer from 0 to 2.");
    if (this.environment !== "development" && this.metricsToken.length < 32)
      throw new Error(
        "API_METRICS_TOKEN must be injected outside development.",
      );
    if (this.webOrigin) {
      const parsed = new URL(this.webOrigin);
      if (
        parsed.origin !== this.webOrigin ||
        (parsed.protocol !== "https:" &&
          !(
            this.environment === "development" &&
            parsed.protocol === "http:" &&
            ["127.0.0.1", "localhost"].includes(parsed.hostname)
          ))
      ) {
        throw new Error(
          "WEB_ORIGIN must be one HTTPS origin (loopback HTTP only in development).",
        );
      }
    }
    if (this.vapidPublicKey) {
      const key = Buffer.from(this.vapidPublicKey, "base64url");
      if (
        key.length !== 65 ||
        key[0] !== 4 ||
        key.toString("base64url") !== this.vapidPublicKey
      )
        throw new Error("VAPID_PUBLIC_KEY must be an uncompressed P-256 point");
    }
  }
}
