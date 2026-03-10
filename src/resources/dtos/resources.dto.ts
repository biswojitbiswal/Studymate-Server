import { IsString, IsOptional, IsEnum, IsMongoId, IsInt, IsUrl, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { FileType } from 'common/enums/resource.enum';
import { Type } from 'class-transformer';


export class CreateResourceDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsMongoId()
  classId: string;

  @IsEnum(FileType)
  type: FileType;

  @IsUrl()
  fileUrl: string;

  @IsInt()
  size: number;
}


export class UpdateResourceDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(FileType)
  type: FileType;

  @IsOptional()
  @IsUrl()
  fileUrl: string;

  @IsOptional()
  @IsInt()
  size: number;
}


export class ResourceFilterDto {
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
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  classId?: string
}