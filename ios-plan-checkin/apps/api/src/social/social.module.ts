import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import {
  BlocksController,
  FriendRequestsController,
  FriendsController,
  UserSearchController,
} from "./social.controller.js";
import { SocialService } from "./social.service.js";

@Module({
  imports: [AuthModule],
  controllers: [
    UserSearchController,
    FriendRequestsController,
    FriendsController,
    BlocksController,
  ],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
