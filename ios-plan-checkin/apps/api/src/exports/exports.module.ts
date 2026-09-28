import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ObjectStore } from "../media/object-store.js";
import { ExportsController } from "./exports.controller.js";
import { ExportsService } from "./exports.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ExportsController],
  providers: [ExportsService, ObjectStore],
})
export class ExportsModule {}
