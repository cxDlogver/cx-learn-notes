import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import {
  BlocksController,
  FriendRequestsController,
  FriendsController,
  UserSearchController,
} from "./social.controller.js";
import { SocialService } from "./social.service.js";
import {
  FriendSharedPlansController,
  PlanSharesController,
  SharedPlansController,
} from "./shares.controller.js";
import { SharesService } from "./shares.service.js";
import { EncouragementsController } from "./encouragements.controller.js";
import { EncouragementsService } from "./encouragements.service.js";
import {
  DevicesController,
  NotificationPreferencesController,
} from "./notifications.controller.js";
import { NotificationsService } from "./notifications.service.js";
import { InboxController } from "./inbox.controller.js";
import { InboxService } from "./inbox.service.js";

@Module({
  imports: [AuthModule],
  controllers: [
    UserSearchController,
    FriendRequestsController,
    FriendsController,
    BlocksController,
    PlanSharesController,
    FriendSharedPlansController,
    SharedPlansController,
    EncouragementsController,
    DevicesController,
    NotificationPreferencesController,
    InboxController,
  ],
  providers: [
    SocialService,
    SharesService,
    EncouragementsService,
    NotificationsService,
    InboxService,
  ],
  exports: [SocialService, SharesService],
})
export class SocialModule {}
