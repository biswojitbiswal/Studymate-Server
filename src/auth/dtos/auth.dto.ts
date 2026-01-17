import { IsEmail, IsNotEmpty, IsOptional, IsString, MinLength, IsEnum, IsPhoneNumber, ValidateIf, IsBoolean } from 'class-validator';
import { Roles, AuthProvider, SignupIntent } from '@prisma/client';

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
    @IsEnum(SignupIntent, { message: 'Signup Intent must be STUDENT or TUTOR' })
    signupIntent?: SignupIntent;
}


export class SigninDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;


    @IsBoolean()
    @IsOptional()
    rememberMe?: boolean

    // @IsOptional()
    // @IsEnum(Roles)
    // role?: Roles;
}


export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class ForgotDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  newPassword: string;
}
