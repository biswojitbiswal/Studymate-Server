import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { DayOfWeek } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateTutorAvailabilityDto {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  @IsString()
  startTime: string; // "09:00"

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  @IsString()
  endTime: string;   // "12:00"

  @IsString()
  timeZone: string; // "Asia/Kolkata"
}


export class UpdateTutorAvailabilityDto {
  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;

  @IsOptional()
  @IsString()
  timeZone?: string;

  // @IsBoolean()
  // @IsOptional()
  // isActive?: boolean
}

export class TutorAvailabilityFilterDto {
  // ───────── Pagination ─────────
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsEnum(DayOfWeek)
  dayOfWeek?: DayOfWeek;

  @IsOptional()
  @IsString()
  timeZone?: string;

  @IsOptional()
  @Type(() => Boolean)
  isActive?: boolean;

  // ───────── Sorting ─────────
  @IsOptional()
  @IsString()
  sortBy?: 'dayOfWeek' | 'startTime' | 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}
