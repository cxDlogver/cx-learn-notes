import { Controller, Get, Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { ProfileModule } from "./profile/profile.module.js";
import { PlansModule } from "./plans/plans.module.js";
import { RecordsModule } from "./records/records.module.js";
import { SocialModule } from "./social/social.module.js";
import { SyncModule } from "./sync/sync.module.js";
import { ViewsModule } from "./views/views.module.js";

@Controller("health")
class HealthController {
  @Get()
  getHealth(): { status: "ok" } {
    return { status: "ok" };
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
  ],
  controllers: [HealthController],
})
export class AppModule {}
