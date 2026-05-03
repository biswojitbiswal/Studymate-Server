import { IsNotEmpty, IsString } from "class-validator";

export class TutorAnalyticsDto{
    @IsString()
    @IsNotEmpty()
    month!: string

    @IsString()
    @IsNotEmpty()
    year!: string
}