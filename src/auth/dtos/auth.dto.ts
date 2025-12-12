import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsEnum, IsPhoneNumber, ValidateIf } from 'class-validator';
import { Roles, AuthProvider } from '@prisma/client';

export class SignupDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @ValidateIf((o) => o.provider === AuthProvider.CREDENTIALS)
    @IsOptional()
    @IsPhoneNumber() // auto detects format; you can use 'IN' for India or any country
    phone?: string;

    @ValidateIf((o) => o.provider === AuthProvider.CREDENTIALS)
    @IsNotEmpty()
    @IsString()
    @MinLength(6, { message: 'Password must be at least 6 characters long' })
    password?: string;

    @IsEnum(AuthProvider)
    provider: AuthProvider; // 'CREDENTIALS' | 'GOOGLE' | 'APPLE'

    @IsOptional() // default role is STUDENT → so role is optional
    @IsEnum(Roles, { message: 'Role must be STUDENT or TUTOR' })
    role?: Roles;
}


export class SigninDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;

    @IsNotEmpty() // default role is STUDENT → so role is optional
    @IsEnum(Roles)
    role: Roles;
}
