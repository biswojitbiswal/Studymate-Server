import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";
import { Type } from 'class-transformer';

export class SubjectDto{
    @IsString()
    @IsNotEmpty()
    name: string

    @Type(() => Number)
    @IsInt()
    @Min(1)
    priority: number
}