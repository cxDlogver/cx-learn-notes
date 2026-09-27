import { Controller, Get, Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { ProfileModule } from "./profile/profile.module.js";
import { PlansModule } from "./plans/plans.module.js";
import { RecordsModule } from "./records/records.module.js";

@Controller("health")
class HealthController {
  @Get()
  getHealth(): { status: "ok" } {
    return { status: "ok" };
  }
}

@Module({
  imports: [AuthModule, ProfileModule, PlansModule, RecordsModule],
  controllers: [HealthController],
})
export class AppModule {}
