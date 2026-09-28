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
  }
}
