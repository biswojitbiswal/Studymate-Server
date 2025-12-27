import { SessionType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { SessionStatus } from "src/common/enums/session.enum";

export class CreatePrivateSessionDto {
    @IsMongoId()
    @IsNotEmpty()
    classId: string;

    @IsDateString()
    @IsNotEmpty()
    date: string;        // YYYY-MM-DD

    @IsString()
    @IsNotEmpty()
    startTime: string;   // HH:mm

    @IsInt()
    @IsNotEmpty()
    durationMin: number;


}


export class GetClassSessionsDto {
  @IsNotEmpty()
  @IsString()
  classId: string
  // ─────────────────────────
  // Pagination
  // ─────────────────────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  // ─────────────────────────
  // Filters
  // ─────────────────────────
  @IsOptional()
  @IsEnum(SessionStatus)
  status?: SessionStatus;

  @IsOptional()
  @IsEnum(SessionType)
  sessionType?: SessionType;

  // ─────────────────────────
  // Date range filter
  // ─────────────────────────
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}


export class RescheduleSessionDto {
  @IsDateString()
  date: string; // "2025-01-25"

  @IsString()
  startTime: string; // "10:30"

  @IsInt()
  @Min(15)
  durationMin: number;

  @IsOptional()
  @IsString()
  reason?: string; // optional, useful for UI later
}


export class CreateGroupExtraSessionDto {
  @IsMongoId()
  classId: string;

  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsString()
  startTime: string; // HH:mm (24h)

  @IsInt()
  @Min(1)
  durationMin: number;


  @IsEnum(SessionType)
  sessionType: SessionType; // EXTRA | DBOUT
}


export class CreateGroupDboutSessionDto {
  @IsMongoId()
  classId: string;

  @IsDateString()
  date: string; // YYYY-MM-DD

  @IsString()
  startTime: string; // HH:mm (24h)

  @IsInt()
  @Min(1)
  durationMin: number;


  @IsEnum(SessionType)
  sessionType: SessionType; // EXTRA | DBOUT
}