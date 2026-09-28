import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { DeletionController } from "./deletion.controller.js";
import { DeletionService } from "./deletion.service.js";

@Module({
  imports: [AuthModule],
  controllers: [DeletionController],
  providers: [DeletionService],
})
export class DeletionModule {}
