import { TaskStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";

export class TaskDto {
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



export class UpdateTaskDto {
    @IsString()
    @IsNotEmpty()
    title: string


    @IsString()
    @IsOptional()
    description?: string


    @IsDateString()
    @IsOptional()
    dueDate?: string


    @IsEnum(TaskStatus)
    @IsOptional()
    status: TaskStatus

}


export class TaskFilterDto {
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
