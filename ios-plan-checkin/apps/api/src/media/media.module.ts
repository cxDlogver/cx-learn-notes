import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { MediaController } from "./media.controller.js";
import { MediaService } from "./media.service.js";
import { ObjectStore } from "./object-store.js";

@Module({
  imports: [AuthModule],
  controllers: [MediaController],
  providers: [MediaService, ObjectStore],
})
export class MediaModule {}
