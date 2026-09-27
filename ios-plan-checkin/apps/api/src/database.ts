import { Injectable, OnModuleDestroy } from "@nestjs/common";
import pg, { type PoolClient } from "pg";
import { ApiConfig } from "./config.js";

@Injectable()
export class Database implements OnModuleDestroy {
  private readonly pool: pg.Pool;

  constructor(config: ApiConfig) {
    this.pool = new pg.Pool({ connectionString: config.databaseUrl, max: 20 });
  }

  query<T extends pg.QueryResultRow = pg.QueryResultRow>(
    sql: string,
    params: unknown[] = [],
  ): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(sql, params);
  }

  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
