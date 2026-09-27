import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { GroupsService } from "./groups.service.js";
import { GroupsController, PlansController } from "./plans.controller.js";
import { PlansService } from "./plans.service.js";
import { RemindersController } from "./reminders.controller.js";
import { RemindersService } from "./reminders.service.js";

@Module({
  imports: [AuthModule],
  controllers: [GroupsController, PlansController, RemindersController],
  providers: [GroupsService, PlansService, RemindersService],
})
export class PlansModule {}
