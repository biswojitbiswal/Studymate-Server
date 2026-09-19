import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsEnum,
  ValidateIf,
  IsBoolean,
  MaxLength,
} from 'class-validator';
import { Roles, AuthProvider, SignupIntent } from '@prisma/client';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  turnstileToken!: string;

  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ValidateIf((o) => o.provider === AuthProvider.CREDENTIALS)
  @IsOptional()
  @IsString() // auto detects format; you can use 'IN' for India or any country
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
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  turnstileToken: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;

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
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}

export class ForgotDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  turnstileToken: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetForgotPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
