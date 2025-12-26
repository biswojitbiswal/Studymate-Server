import { ClassType, ClassVisibility } from '@prisma/client';
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
    @IsMongoId()
    subjectId: string;

    @IsMongoId()
    levelId: string;

    @IsOptional()
    @IsMongoId()
    boardId?: string;

    @IsOptional()
    @IsMongoId()
    languageId?: string;

    // ─────────────────────────
    // Basic Info
    // ─────────────────────────
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsArray()
    syllabus: any[]; // structured JSON (validated at service level)

    // @IsOptional()
    // @IsString()
    // previewImg?: string;

    // @IsOptional()
    // @IsString()
    // previewVdo?: string;

    // ─────────────────────────
    // Class Nature
    // ─────────────────────────
    @IsEnum(ClassType)
    type: ClassType;

    @IsEnum(ClassVisibility)
    visibility: ClassVisibility;

    // @IsEnum(ClassStatus)
    // status: ClassStatus;

    // ─────────────────────────
    // Duration
    // ─────────────────────────
    @IsDateString()
    startDate: string;

    @IsDateString()
    endDate: string;

    // ─────────────────────────
    // Enrollment window (GROUP)
    // ─────────────────────────
    @IsNotEmpty()
    @IsDateString()
    joiningStartDate: string;

    @IsNotEmpty()
    @IsDateString()
    joiningEndDate: string;

    // ─────────────────────────
    // Schedule Template (GROUP)
    // ─────────────────────────
    @IsOptional()
    @IsArray()
    @IsEnum(DayOfWeek, { each: true })
    daysOfWeek?: DayOfWeek[];

    @IsOptional()
    @IsString()
    startTime?: string; // "19:00"

    @IsOptional()
    @IsInt()
    @Min(1)
    durationMin?: number;

    @IsOptional()
    @IsString()
    timeZone?: string;

    // ─────────────────────────
    // Capacity & Pricing
    // ─────────────────────────
    @IsNotEmpty()
    @IsInt()
    @Min(1)
    capacity: number;

    @IsBoolean()
    isPaid: boolean;

    @IsOptional()
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

    @IsOptional() @IsArray()
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
    @IsArray()
    @IsEnum(DayOfWeek, { each: true })
    daysOfWeek?: DayOfWeek[];

    // ───────── Pricing & Structure (DRAFT only)
    @IsOptional() @IsBoolean()
    isPaid?: boolean;

    @IsOptional() @IsNumber()
    price?: number;

    @IsOptional() @IsString()
    currency?: string;

    @IsOptional() @IsInt() @Min(1)
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
    @IsInt()
    @Min(1)
    durationMin?: number;

    @IsOptional()
    @IsString()
    timeZone?: string;

}


export class TutorTuitionClassFilter {
    @IsOptional()
    @IsInt()
    page?: number;

    @IsOptional()
    @IsInt()
    limit?: number;

    @IsOptional()
    @IsString()
    search?: string;          // title + description (+ subject name)

    @IsOptional()
    @IsEnum(ClassStatus)
    status?: ClassStatus;

    @IsOptional()
    @IsEnum(ClassType)
    type?: ClassType;

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