import {
  Controller,
  Get,
  Module,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Database } from "./database.js";
import { AuthModule } from "./auth/auth.module.js";
import { ProfileModule } from "./profile/profile.module.js";
import { PlansModule } from "./plans/plans.module.js";
import { RecordsModule } from "./records/records.module.js";
import { SocialModule } from "./social/social.module.js";
import { SyncModule } from "./sync/sync.module.js";
import { MediaModule } from "./media/media.module.js";
import { ViewsModule } from "./views/views.module.js";
import { ExportsModule } from "./exports/exports.module.js";
import { DeletionModule } from "./deletion/deletion.module.js";

@Controller("health")
class HealthController {
  constructor(private readonly database: Database) {}

  @Get()
  getHealth(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("live")
  getLive(): { status: "ok" } {
    return { status: "ok" };
  }

  @Get("ready")
  async getReady(): Promise<{ status: "ok" }> {
    try {
      await this.database.query("SELECT 1");
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException({
        code: "SERVICE_UNAVAILABLE",
        message: "数据库暂时不可用",
      });
    }
  }
}

@Module({
  imports: [
    AuthModule,
    ProfileModule,
    PlansModule,
    RecordsModule,
    ViewsModule,
    SocialModule,
    SyncModule,
    MediaModule,
    ExportsModule,
    DeletionModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
