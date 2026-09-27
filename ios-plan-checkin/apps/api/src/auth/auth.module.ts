import { Module } from "@nestjs/common";
import { ApiConfig } from "../config.js";
import { Database } from "../database.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { SmsProvider } from "./sms-provider.js";

@Module({
  controllers: [AuthController],
  providers: [ApiConfig, Database, SmsProvider, AuthService],
  exports: [AuthService, Database, ApiConfig],
})
export class AuthModule {}
