import {
  IsString,
  IsOptional,
  IsArray,
  IsMongoId,
  IsNumber,
  Min,
  Max,
  ArrayNotEmpty,
  IsUrl,
  IsEmail,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class TutorApplyDto {
  @IsNotEmpty()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title: string;

  @IsArray()
  @ArrayNotEmpty()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(String) : [String(value)]
  )
  @IsString({ each: true })
  subjectIds: string[];

  @IsArray()
  @ArrayNotEmpty()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(String) : [String(value)]
  )
  @IsString({ each: true })
  levelIds: string[];

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  @Max(60)
  yearsOfExp?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  bio?: string;

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(String) : [String(value)]
  )
  @IsString({ each: true })
  qualification?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map(String) : [String(value)]
  )
  @IsUrl({}, { each: true })
  demoLinks?: string[];
}




export class TutorProfileUpdateDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title?: string;


  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value)
  )
  @IsNumber()
  @Min(0)
  @Max(60)
  yearsOfExp?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  qualification?: string[];

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  demoLinks?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((v) => String(v)) : []
  )
  @IsString({ each: true })
  subjectIds?: string[];

  @IsOptional()
  @IsArray()
  @Transform(({ value }) =>
    Array.isArray(value) ? value.map((v) => String(v)) : []
  )
  @IsString({ each: true })
  levelIds?: string[];
}


export enum TutorSortBy {
  RECOMMENDED = "RECOMMENDED",
  HIGHEST_RATED = "HIGHEST_RATED",
  MOST_STUDENTS = "MOST_STUDENTS",
  MOST_EXPERIENCED = "MOST_EXPERIENCED",
  NEWEST = "NEWEST",
}


export class TutorBrowseFilterDto {
   // Pagination
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  // Search
  @IsOptional()
  @IsString()
  search?: string;

  // Subject
  @IsOptional()
  @IsMongoId()
  subjectId?: string;

  // Level
  @IsOptional()
  @IsMongoId()
  levelId?: string;

  // Experience
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  minExperience?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  maxExperience?: number;

  // Rating
  @IsOptional()
  @Type(() => Number)
  minRating?: number;

  // Availability
  @IsOptional()
  @IsBoolean()
  availableNow?: boolean;

  // Sort
  @IsOptional()
  @IsEnum(TutorSortBy)
  sortBy?: TutorSortBy = TutorSortBy.RECOMMENDED;
}