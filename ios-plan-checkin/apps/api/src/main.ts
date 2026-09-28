import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { ApiExceptionFilter } from "./http.js";
import { ApiConfig } from "./config.js";
import { Database } from "./database.js";
import { installObservability } from "./observability.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new ApiExceptionFilter());
  installObservability(app, app.get(Database), app.get(ApiConfig));
  app.enableShutdownHooks();
  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
