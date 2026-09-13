import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsMongoId,
  IsNumberString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDMDto {
    @IsMongoId()
    @IsString()
    @IsNotEmpty()
    receiverId!: string;

    @IsMongoId()
    @IsString()
    @IsNotEmpty()
    classId!: string;
}


export class CreateGroupDto {
    @IsMongoId()
    @IsString()
    @IsNotEmpty()
    classId!: string;
}


export class CreateMessageDto {
    @IsMongoId()
    @IsString()
    @IsNotEmpty()
    conversationId!: string;

    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @IsString()
    @IsNotEmpty()
    @MaxLength(2000)
    content!: string;

    @IsOptional()
    @IsMongoId()
    @IsString()
    replyToId?: string;
}


export class GetMessagesDto {
  @IsMongoId()
  @IsString()
  conversationId!: string;

  @IsOptional()
  @IsMongoId()
  @IsString()
  cursor?: string; // messageId for pagination

  @IsOptional()
  @IsNumberString()
  limit?: string; // default 20
}
