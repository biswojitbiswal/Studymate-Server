import { IsBoolean, IsOptional, IsString } from "class-validator";

export class PreferenceDto{
    @IsBoolean()
    @IsOptional()
    emailEnabled?: boolean

    @IsBoolean()
    @IsOptional()
    inAppEnabled?: boolean

    @IsBoolean()
    @IsOptional()
    smsEnabled?: boolean

    @IsBoolean()
    @IsOptional()
    pushEnabled?: boolean
}