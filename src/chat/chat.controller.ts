import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ChatService } from "./chat.service";
import { RolesGuard } from "common/guards/roles.guard";
import { Roles } from "common/decorator/roles.decorator";
import { CreateDMDto, CreateGroupDto, CreateMessageDto, GetMessagesDto } from "./dtos/chat.dto";
import { GetCurrentUserId } from "common/decorator/get-current-user-id.decorator";
import { AuthGuard } from "common/guards/auth.guard";

@Controller({
    path: 'chat',
    version: "1"
})
export class ChatController {
    constructor(private readonly chat: ChatService) { }


    @UseGuards(AuthGuard)
    @Post("dm")
    async createDm(@Body() dto: CreateDMDto, @GetCurrentUserId() userId: string) {
        return await this.chat.createDm(dto, userId)
    }


    @UseGuards(AuthGuard)
    @Post("group")
    async createGroup(
        @Body() dto: CreateGroupDto,
        @GetCurrentUserId() userId: string
    ) {
        return await this.chat.createGroup(dto, userId);
    }


    @UseGuards(AuthGuard)
    @Post("message")
    async createMessage(
        @Body() dto: CreateMessageDto,
        @GetCurrentUserId() userId: string
    ) {
        return await this.chat.createMessage(dto, userId);
    }


    @UseGuards(AuthGuard)
    @Get("conversations")
    async getConversations(
        @GetCurrentUserId() userId: string
    ) {
        return await this.chat.getConversations(userId);
    }


    @UseGuards(AuthGuard)
    @Get("messages")
    async getMessages(
        @Query() dto: GetMessagesDto,
        @GetCurrentUserId() userId: string
    ) {
        return await this.chat.getMessages(dto, userId);
    }


    @UseGuards(AuthGuard)
    @Delete("messages/:id/delete-for-me")
    async deleteForMe(@Param("id") id: string, @GetCurrentUserId() userId: string) {
        return await this.chat.deleteForMe(id, userId);
    }


    @UseGuards(AuthGuard)
    @Delete("messages/:id/delete-for-everyone")
    async deleteForEveryone(@Param("id") id: string, @GetCurrentUserId() userId: string) {
        return await this.chat.deleteForEveryone(id, userId);
    }


    @UseGuards(AuthGuard)
    @Post("messages/:id/toggle-pin")
    async togglePin(@Param("id") id: string, @GetCurrentUserId() userId: string) {
        return await this.chat.togglePinMessage(id, userId);
    }


    @UseGuards(AuthGuard)
    @Post("conversations/:id/toggle-mute")
    toggleMute(@Param("id") id: string, @GetCurrentUserId() userId: string) {
        return this.chat.toggleMute(id, userId);
    }
}