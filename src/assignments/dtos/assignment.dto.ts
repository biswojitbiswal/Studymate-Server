import { TaskStatus } from "@prisma/client";
import { PartialType } from "@nestjs/mapped-types";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsMongoId, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class AssignmentDto {
    @IsMongoId()
    classId: string

    @IsString()
    @IsNotEmpty()
    title: string


    @IsString()
    @IsOptional()
    description?: string


    @IsDateString()
    @IsOptional()
    dueDate?: string
}

export class UpdateAssignmentDto extends PartialType(AssignmentDto) {}


export class AssignmentStatusDto {
    @IsEnum(TaskStatus)
    @IsOptional()
    status: TaskStatus
}



// export class UpdateAssignmentDto {
//     @IsString()
//     @IsNotEmpty()
//     title: string


//     @IsString()
//     @IsOptional()
//     description?: string


//     @IsDateString()
//     @IsOptional()
//     dueDate?: string


//     @IsEnum(TaskStatus)
//     @IsOptional()
//     status: TaskStatus

// }


export class AssignmentFilterDto {
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
    @IsEnum(['ALL', 'TODO', 'ONGOING', 'COMPLETED'])
    status?: 'ALL' | 'TODO' | 'ONGOING' | 'COMPLETED';


    @IsOptional()
    @IsEnum(['TODAY', 'WEEK', 'ALL'])
    range?: 'TODAY' | 'WEEK' | 'ALL';

    @IsDateString()
    @IsOptional()
    date?: string
}


export class StudentAssignmentFilterDto {
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
    @IsMongoId()
    classId?: string

    @IsOptional()
    @IsEnum(['ALL', 'TODO', 'ONGOING', 'COMPLETED'])
    status?: 'ALL' | 'TODO' | 'ONGOING' | 'COMPLETED';


    @IsOptional()
    @IsEnum(['TODAY', 'WEEK', 'ALL'])
    range?: 'TODAY' | 'WEEK' | 'ALL';

    @IsDateString()
    @IsOptional()
    date?: string
}
