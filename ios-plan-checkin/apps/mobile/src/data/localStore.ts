import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import * as SecureStore from "expo-secure-store";
import * as SQLite from "expo-sqlite";
import { Platform } from "react-native";
import { localMigrations, localSchemaVersion } from "./localMigrations";

const activeAccountKey = "plan-checkin.local.active-account.v1";
const keyPrefix = "plan-checkin.local.database-key.";
type Database = SQLite.SQLiteDatabase;

async function accountHash(accountId: string): Promise<string> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      accountId,
    )
  )
    throw new Error("账户标识不正确");
  return (
    await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      accountId.toLowerCase(),
    )
  ).slice(0, 32);
}
function databaseName(hash: string): string {
  return `pc_${hash}.db`;
}
function mediaDirectory(hash: string): Directory {
  return new Directory(Paths.document, "plan-checkin-media", hash);
}
function databaseFile(name: string): File {
  if (!SQLite.defaultDatabaseDirectory) throw new Error("本地数据库目录不可用");
  return new File(SQLite.defaultDatabaseDirectory, name);
}
function randomKey(): string {
  return Array.from(Crypto.getRandomBytes(32), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

/** One account, one keyed connection. All reads and writes share a FIFO queue and the same SQLCipher connection. */
export class LocalStore {
  private database: Database | null = null;
  private accountId: string | null = null;
  private tail: Promise<void> = Promise.resolve();

  private async serial<T>(task: () => Promise<T>): Promise<T> {
    const previous = this.tail;
    let release!: () => void;
    this.tail = new Promise<void>((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await task();
    } finally {
      release();
    }
  }

  private requireAccount(accountId: string): Database {
    if (this.accountId !== accountId || !this.database)
      throw new Error("本地账户已切换，请重新打开页面");
    return this.database;
  }

  async read<T>(
    accountId: string,
    task: (database: Database) => Promise<T>,
  ): Promise<T> {
    return this.serial(() => task(this.requireAccount(accountId)));
  }

  /** Caller must use the supplied keyed connection; calling another LocalStore method inside this callback would deadlock. */
  async transaction<T>(
    accountId: string,
    task: (database: Database) => Promise<T>,
  ): Promise<T> {
    return this.serial(async () => {
      const database = this.requireAccount(accountId);
      await database.execAsync("BEGIN IMMEDIATE");
      try {
        const result = await task(database);
        await database.execAsync("COMMIT");
        return result;
      } catch (error) {
        await database.execAsync("ROLLBACK");
        throw error;
      }
    });
  }

  private async migrate(database: Database): Promise<void> {
    let current =
      (
        await database.getFirstAsync<{ user_version: number }>(
          "PRAGMA user_version",
        )
      )?.user_version ?? 0;
    if (current > localSchemaVersion)
      throw new Error("本地数据由较新版本创建，请更新应用");
    for (const migration of localMigrations) {
      if (migration.version <= current) continue;
      if (migration.version !== current + 1)
        throw new Error("本地数据库迁移版本不连续");
      await database.execAsync("BEGIN IMMEDIATE");
      try {
        await database.execAsync(migration.sql);
        await database.execAsync(`PRAGMA user_version = ${migration.version}`);
        await database.execAsync("COMMIT");
        current = migration.version;
      } catch (error) {
        await database.execAsync("ROLLBACK");
        throw error;
      }
    }
  }

  async activate(accountId: string): Promise<void> {
    return this.serial(async () => {
      if (Platform.OS !== "ios")
        throw new Error("加密本地数据库仅支持 iOS 构建");
      if (this.accountId === accountId && this.database) return;
      const previous = await SecureStore.getItemAsync(activeAccountKey);
      if (previous && previous !== accountId) await this.purge(previous);
      if (this.database) {
        await this.database.closeAsync();
        this.database = null;
        this.accountId = null;
      }
      const hash = await accountHash(accountId);
      const name = databaseName(hash);
      const existed = databaseFile(name).exists;
      let key = await SecureStore.getItemAsync(`${keyPrefix}${hash}`);
      if (!key && existed)
        throw new Error("本地数据库密钥不可用，请先清理此设备上的账户数据");
      const newKey = !key;
      if (!key) {
        key = randomKey();
        await SecureStore.setItemAsync(`${keyPrefix}${hash}`, key, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        });
      }
      let database: Database | null = null;
      try {
        database = await SQLite.openDatabaseAsync(name);
        await database.execAsync(`PRAGMA key = '${key}';`);
        const cipher = await database.getFirstAsync<{ cipher_version: string }>(
          "PRAGMA cipher_version",
        );
        if (!cipher?.cipher_version)
          throw new Error("此 iOS 构建未启用 SQLCipher");
        await database.execAsync(
          "PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;",
        );
        await this.migrate(database);
        mediaDirectory(hash).create({ idempotent: true, intermediates: true });
        await SecureStore.setItemAsync(activeAccountKey, accountId, {
          keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
        });
        this.database = database;
        this.accountId = accountId;
      } catch (error) {
        if (database) await database.closeAsync();
        if (newKey && !existed) {
          if (databaseFile(name).exists) await SQLite.deleteDatabaseAsync(name);
          await SecureStore.deleteItemAsync(`${keyPrefix}${hash}`);
        }
        throw error;
      }
    });
  }

  private async purge(accountId: string): Promise<void> {
    const hash = await accountHash(accountId);
    if (this.accountId === accountId && this.database) {
      await this.database.closeAsync();
      this.database = null;
      this.accountId = null;
    }
    const name = databaseName(hash);
    if (databaseFile(name).exists) await SQLite.deleteDatabaseAsync(name);
    const media = mediaDirectory(hash);
    if (media.exists) media.delete();
    await SecureStore.deleteItemAsync(`${keyPrefix}${hash}`);
  }

  async clearCurrent(): Promise<void> {
    return this.serial(async () => {
      const accountId =
        this.accountId ?? (await SecureStore.getItemAsync(activeAccountKey));
      if (accountId) await this.purge(accountId);
      await SecureStore.deleteItemAsync(activeAccountKey);
    });
  }

  async mediaRoot(accountId: string): Promise<string> {
    return this.serial(async () => {
      this.requireAccount(accountId);
      return mediaDirectory(await accountHash(accountId)).uri;
    });
  }
}

export const localStore = new LocalStore();
