import { Transform } from "class-transformer";
import { IsArray, IsEmail, IsMongoId, IsOptional, IsString } from "class-validator";

export class StudentDto {
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
  @IsMongoId()
  levelId?: string;

  @IsOptional()
  @IsMongoId()
  boardId?: string;

  @IsOptional()
  @IsMongoId()
  languageId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  goals?: string[];

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  subjectIds?: string[];
}