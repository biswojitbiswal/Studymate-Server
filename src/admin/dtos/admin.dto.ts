import { IsDateString, IsNotEmpty, IsString } from "class-validator";

export class TutorAnalyticsDto{
    @IsString()
    @IsNotEmpty()
    month!: string

    @IsString()
    @IsNotEmpty()
    year!: string
}


export class AdminAnalyticsDto{
    @IsNotEmpty()
    @IsDateString()
    fromDate!: string


    @IsNotEmpty()
    @IsDateString()
    toDate!: string
}