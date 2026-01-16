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
} from 'class-validator';
import { Transform } from 'class-transformer';

export class TutorApplyDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  title?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  subjectIds: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  levelIds: string[];

  @IsOptional()
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
  @IsMongoId({ each: true })
  subjectIds?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  levelIds?: string[];
}