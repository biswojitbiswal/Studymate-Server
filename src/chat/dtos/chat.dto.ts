import { IsNotEmpty, IsNumberString, IsOptional, IsString } from "class-validator";

export class CreateDMDto {
    @IsString()
    @IsNotEmpty()
    receiverId!: string;

    @IsString()
    @IsNotEmpty()
    classId!: string;
}


export class CreateGroupDto {
    @IsString()
    @IsNotEmpty()
    classId!: string;
}


export class CreateMessageDto {
    @IsString()
    @IsNotEmpty()
    conversationId!: string;

    @IsString()
    @IsNotEmpty()
    content!: string;

    @IsOptional()
    @IsString()
    replyToId?: string;
}


export class GetMessagesDto {
  @IsString()
  conversationId!: string;

  @IsOptional()
  @IsString()
  cursor?: string; // messageId for pagination

  @IsOptional()
  @IsNumberString()
  limit?: string; // default 20
}