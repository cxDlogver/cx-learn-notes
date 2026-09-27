import { mkdir, writeFile } from "node:fs/promises";
import { Injectable } from "@nestjs/common";
import { ApiConfig } from "../config.js";

@Injectable()
export class SmsProvider {
  constructor(private readonly config: ApiConfig) {}

  async send(phoneE164: string, code: string, purpose: string): Promise<void> {
    if (this.config.smsProvider === "stub") {
      // The development-only outbox is ignored by Git and never enters API logs.
      const directory = new URL("../../.local/", import.meta.url);
      await mkdir(directory, { recursive: true });
      await writeFile(
        new URL("sms-outbox.json", directory),
        JSON.stringify({
          phoneE164,
          code,
          purpose,
          createdAt: new Date().toISOString(),
        }),
        { encoding: "utf8", mode: 0o600 },
      );
      return;
    }
    const response = await fetch(this.config.smsGatewayUrl!, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.config.smsGatewayToken}`,
      },
      body: JSON.stringify({ phoneE164, code, purpose }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok)
      throw new Error("SMS gateway rejected the delivery request.");
  }
}
