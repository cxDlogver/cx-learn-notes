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
  ],
  providers: [SocialService, SharesService],
  exports: [SocialService, SharesService],
})
export class SocialModule {}
