import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { ViewsController } from "./views.controller.js";
import { ViewsService } from "./views.service.js";

@Module({
  imports: [AuthModule],
  controllers: [ViewsController],
  providers: [ViewsService],
})
export class ViewsModule {}
