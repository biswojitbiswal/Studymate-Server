import { ClassType, ClassVisibility } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
    IsString,
    IsOptional,
    IsEnum,
    IsBoolean,
    IsDateString,
    IsArray,
    IsInt,
    Min,
    IsMongoId,
    IsNumber,
    IsNotEmpty,
    IsIn,
} from 'class-validator';
import { ClassStatus, DayOfWeek } from 'src/common/enums/tuition-class.enum';



export class CreateTuitionClassDto {
    // ─────────────────────────
    // Academic
    // ─────────────────────────

    @IsString()
    subjectId: string;

    @IsString()
    levelId: string;

    @IsOptional()
    @IsString()
    boardId?: string;

    @IsOptional()
    @IsString()
    languageId?: string;

    // ─────────────────────────
    // Basic Info
    // ─────────────────────────

    @IsString()
    title: string;

    @IsString()
    description: string;

    /**
     * Sent as JSON string from FormData
     * Transform → real array
     */
    @Transform(({ value }) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;

        try {
            return JSON.parse(value);
        } catch {
            throw new Error('Syllabus must be valid JSON');
        }
    })
    @IsArray()
    syllabus: any[];

    // ─────────────────────────
    // Class Nature
    // ─────────────────────────

    @IsEnum(ClassType)
    type: ClassType;

    @IsEnum(ClassVisibility)
    visibility: ClassVisibility;

    // ─────────────────────────
    // Duration
    // ─────────────────────────

    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    // ─────────────────────────
    // Enrollment window
    // ─────────────────────────

    @IsDateString()
    joiningStartDate: string;

    @IsDateString()
    joiningEndDate: string;

    // ─────────────────────────
    // Schedule (GROUP)
    // ─────────────────────────

    /**
     * daysOfWeek[] comes as:
     * - string
     * - or array of strings
     */
    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsArray()
    @IsEnum(DayOfWeek, { each: true })
    daysOfWeek?: DayOfWeek[];

    @IsOptional()
    @IsString()
    startTime?: string;

    @IsOptional()
    @Transform(({ value }) => (value ? Number(value) : undefined))
    @IsInt()
    @Min(1)
    durationMin?: number;

    @IsOptional()
    @IsString()
    timeZone?: string;

    // ─────────────────────────
    // Capacity & Pricing
    // ─────────────────────────

    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    capacity: number;

    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isPaid: boolean;

    @IsOptional()
    @Transform(({ value }) => (value ? Number(value) : undefined))
    @IsNumber()
    price?: number;

    @IsOptional()
    @IsString()
    currency?: string;
}



export class TutorUpdateTuitionClassDto {
    @IsOptional() @IsString()
    title?: string;

    @IsOptional() @IsString()
    description?: string;

    @Transform(({ value }) => {
        if (!value) return [];
        if (Array.isArray(value)) return value;

        try {
            return JSON.parse(value);
        } catch {
            throw new Error('Syllabus must be valid JSON');
        }
    })
    @IsArray()
    syllabus?: any[];

    @IsOptional() @IsString()
    previewImg?: string;

    @IsOptional() @IsString()
    previewVdo?: string;

    @IsOptional() @IsEnum(ClassVisibility)
    visibility?: ClassVisibility;

    @IsOptional()
    @IsEnum(ClassType)
    type?: ClassType;


    @IsOptional()
    @Transform(({ value }) => {
        if (!value) return undefined;
        return Array.isArray(value) ? value : [value];
    })
    @IsArray()
    @IsEnum(DayOfWeek, { each: true })
    daysOfWeek?: DayOfWeek[];

    // ───────── Pricing & Structure (DRAFT only)
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    isPaid?: boolean;

    @IsOptional()
    @Transform(({ value }) => (value ? Number(value) : undefined))
    @IsNumber()
    price?: number;

    @IsOptional() @IsString()
    currency?: string;

    @Transform(({ value }) => Number(value))
    @IsInt()
    @Min(1)
    capacity?: number;

    @IsOptional()
    @IsDateString()
    startDate: string;

    @IsOptional()
    @IsDateString()
    endDate: string;

    @IsOptional() @IsDateString()
    joiningStartDate?: string;

    @IsOptional() @IsDateString()
    joiningEndDate?: string;

    @IsOptional()
    @IsString()
    startTime?: string; // "19:00"

    @IsOptional()
    @Transform(({ value }) => (value ? Number(value) : undefined))
    @IsInt()
    @Min(1)
    durationMin?: number;

    @IsOptional()
    @IsString()
    timeZone?: string;

}


export class TutorTuitionClassFilter {
    @IsInt()
    @Type(() => Number)
    @IsOptional()
    page?: number;


    @IsInt()
    @Type(() => Number) @IsOptional()
    limit?: number;

    @IsOptional()
    @IsString()
    search?: string;          // title + description (+ subject name)

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsOptional()
    @IsEnum(ClassStatus)
    status?: ClassStatus;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsOptional()
    @IsEnum(ClassType)
    type?: ClassType;

    @Transform(({ value }) => value === '' ? undefined : value)
    @IsOptional()
    @IsEnum(ClassVisibility)
    visibility?: ClassVisibility;

    @IsOptional()
    @IsIn(['createdAt', 'startDate', 'price'])
    sortBy?: 'createdAt' | 'startDate' | 'price';

    @IsOptional()
    @IsIn(['asc', 'desc'])
    sortOrder?: 'asc' | 'desc';
}



export class AdminUpdateTuitionClassDto {
    // ─────────────────────────
    // Content & Moderation
    // ─────────────────────────
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    syllabus?: any[];

    @IsOptional()
    @IsString()
    previewImg?: string;

    @IsOptional()
    @IsString()
    previewVdo?: string;

    @IsOptional()
    @IsEnum(ClassVisibility)
    visibility?: ClassVisibility;

    // ─────────────────────────
    // Lifecycle Control
    // ─────────────────────────
    @IsOptional()
    @IsEnum(ClassStatus)
    status?: ClassStatus;

    // ─────────────────────────
    // Pricing (Disputes / Fixes)
    // ─────────────────────────
    @IsOptional()
    @IsBoolean()
    isPaid?: boolean;

    @IsOptional()
    @IsNumber()
    price?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    // ─────────────────────────
    // GROUP-only Controls
    // ─────────────────────────
    @IsOptional()
    @IsInt()
    @Min(1)
    capacity?: number;

    @IsOptional()
    @IsDateString()
    joiningStartDate?: string;

    @IsOptional()
    @IsDateString()
    joiningEndDate?: string;
}