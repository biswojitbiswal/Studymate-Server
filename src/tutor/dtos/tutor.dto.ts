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
} from 'class-validator';
import { Transform } from 'class-transformer';

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