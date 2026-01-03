import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreateTutorTimeOffDto {
  @IsDateString()
  date: string; // "2025-02-10"

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime: string; // "10:30"

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime: string; // "11:30"

  @IsOptional()
  @IsString()
  reason?: string;
}


export class TutorTimeOffFilterDto {
  // ───────── Pagination ─────────
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  limit?: number;

  // ───────── Date Filters ─────────
  @IsOptional()
  @IsDateString()
  fromDate?: string; // inclusive

  @IsOptional()
  @IsDateString()
  toDate?: string; // inclusive
}
