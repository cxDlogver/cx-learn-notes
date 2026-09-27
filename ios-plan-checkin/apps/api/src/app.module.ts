import { Controller, Get, Module } from "@nestjs/common";
import { AuthModule } from "./auth/auth.module.js";
import { ProfileModule } from "./profile/profile.module.js";

@Controller("health")
class HealthController {
  @Get()
  getHealth(): { status: "ok" } {
    return { status: "ok" };
  }
}

@Module({
  imports: [AuthModule, ProfileModule],
  controllers: [HealthController],
})
export class AppModule {}
