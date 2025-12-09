import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SigninDto, SignupDto } from "./dtos/auth.dto";
import { AuthProvider, Roles } from '@prisma/client'
import * as bcrypt from 'bcrypt';
import { JwtService } from "@nestjs/jwt";


@Injectable({})
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private jwtService: JwtService,
    ) { }

    async signup(dto: SignupDto) {
        try {
            const { name, email, phone, password, role, provider } = dto;

            let hashedPassword: string | null = null;

            if (dto.provider === AuthProvider.CREDENTIALS) {
                if (!dto.password) {
                    throw new BadRequestException('Password is required');
                }

                hashedPassword = await bcrypt.hash(dto.password, 10);
            }


            const existing = await this.prisma.user.findUnique({
                where: { email: dto.email }
            })

            if (existing) {
                throw new ConflictException("A user with this email already exists")
            }

            if (dto.phone) {
                const phoneUser = await this.prisma.user.findFirst({
                    where: { phone: dto.phone },
                });

                if (phoneUser) {
                    throw new BadRequestException({
                        message: 'Phone number already in use.',
                    });
                }
            }

            const user = await this.prisma.user.create({
                data: {
                    name: dto.name,
                    email: dto.email,
                    phone: dto.phone ?? null,
                    password: hashedPassword,
                    role: dto.role ?? Roles.STUDENT,
                    provider: dto.provider,
                    isEmailVerified: true,
                    isPhoneVerified: true,
                },
            });

            // 4. Optionally send email OTP for credentials-based signup
            // if (dto.provider === AuthProvider.CREDENTIALS) {
            //     // await this.sendVerificationOtp(user); // email OTP
            // }

            return user;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException("Internal server error")
        }
    }


    async signin(dto: SigninDto) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });

            // 1. User must exist
            if (!user) {
                throw new NotFoundException(
                    'User not found, Please complete the signup process',
                );
            }

            // 2. Check provider (only allow CREDENTIALS here)
            if (user.provider !== AuthProvider.CREDENTIALS) {
                throw new BadRequestException(
                    `This account is registered using ${user.provider}. Please login with ${user.provider.toLowerCase()} sign-in.`,
                );
            }

            // 3. Check verification (email or phone – your current condition)
            if (!user.isEmailVerified && !user.isPhoneVerified) {
                throw new BadRequestException('Please complete the verification process');
            }

            // 4. Check role matches
            if (user.role !== dto.role) {
                // e.g. trying to login as TUTOR with a STUDENT account
                throw new BadRequestException('User associated with another account');
            }

            // 5. Ensure user has a password (should always be true for CREDENTIALS)
            if (!user.password) {
                throw new BadRequestException(
                    'Password login is not available for this account',
                );
            }

            // 6. Verify password
            const isPasswordValid = await bcrypt.compare(dto.password, user.password);
            if (!isPasswordValid) {
                throw new BadRequestException('Invalid email or password');
            }

            // 7. Generate JWT token
            const payload = {
                sub: user.id,
                email: user.email,
                role: user.role,
            };

            const accessToken = await this.jwtService.signAsync(payload);

            // 8. Return sanitized user + token
            return {
                accessToken,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar,
                    provider: user.provider,
                },
            };
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Internal server error');
        }
    }
}

