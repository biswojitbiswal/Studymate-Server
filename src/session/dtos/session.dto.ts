import { IsDateString, IsInt, IsMongoId, IsNotEmpty, IsString } from "class-validator";

export class CreatePrivateSessionDto {
    @IsMongoId()
    @IsNotEmpty()
    classId: string;

    @IsDateString()
    @IsNotEmpty()
    date: string;        // YYYY-MM-DD

    @IsString()
    @IsNotEmpty()
    startTime: string;   // HH:mm

    @IsInt()
    @IsNotEmpty()
    durationMin: number;


}