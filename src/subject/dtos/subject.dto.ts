import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { Type } from 'class-transformer';
import { Status } from "@prisma/client";

export class SubjectDto {
    @IsString()
    @IsNotEmpty()
    name: string

    @Type(() => Number)
    @IsInt()
    @Min(1)
    priority: number

    @IsEnum(Status)
    @IsOptional()
    status?: Status
}



export class UpdateSubjectDto {
    @IsString()
    @IsOptional()
    name?: string

    @Type(() => Number)
    @IsOptional()
    @IsInt()
    @Min(1)
    priority?: number

    @IsEnum(Status)
    @IsOptional()
    status?: Status
}