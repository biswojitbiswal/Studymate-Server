import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTutorLeaveDto {
    @IsDateString()
    startDate: string; // "2025-02-10"

    @IsDateString()
    endDate: string;   // "2025-02-12"

    @IsOptional()
    @IsString()
    reason?: string;
}


export class TutorLeaveFilterDto {
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

    @IsOptional()
    @IsDateString()
    fromDate?: string; // inclusive

    @IsOptional()
    @IsDateString()
    toDate?: string; // inclusive
}