import { Type } from "class-transformer";
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from "class-validator";
import { Status } from "common/enums/tuition-class.enum";

export class ReviewDto {
    @IsString()
    classId: string

    @IsInt()
    rating: number

    @IsString()
    @IsOptional()
    reviewText?: string
}



export class ReviewFilterDto {
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

    @IsOptional()
    @IsString()
    tutorId?: string
}


export class ReviewStatusDto{
    @IsEnum(Status)
    @IsNotEmpty()
    status: Status
}