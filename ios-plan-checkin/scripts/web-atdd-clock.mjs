import process from "node:process";
import { URL } from "node:url";

const frozenNowUtc = process.env.WEB_ATDD_FROZEN_NOW;
if (!frozenNowUtc) throw new Error("WEB_ATDD_FROZEN_NOW is required");
const databaseUrl = process.env.WEB_ATDD_DATABASE_URL;
if (!databaseUrl) throw new Error("WEB_ATDD_DATABASE_URL is required");
const database = new URL(databaseUrl);
if (
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  !/^web_atdd(?:_[a-z0-9]+)?$/.test(database.pathname.slice(1)) ||
  process.env.APP_ENV !== "development" ||
  process.env.SMS_PROVIDER !== "stub"
)
  throw new Error(
    "Clock injection is restricted to isolated loopback Web ATDD runs",
  );
if (
  !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(frozenNowUtc) ||
  Number.isNaN(new Date(frozenNowUtc).valueOf())
)
  throw new Error("WEB_ATDD_FROZEN_NOW must be an exact ISO UTC instant");

const NativeDate = globalThis.Date;
const frozen = NativeDate.parse(frozenNowUtc);
class FrozenDate extends NativeDate {
  constructor(...args) {
    super(...(args.length ? args : [frozen]));
  }
  static now() {
    return frozen;
  }
}
globalThis.Date = FrozenDate;
