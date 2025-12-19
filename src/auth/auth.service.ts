import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { SigninDto, SignupDto } from "./dtos/auth.dto";
import { AuthProvider, Roles } from '@prisma/client'
import * as bcrypt from 'bcrypt';
import { JwtService } from "@nestjs/jwt";
import { generateRefreshTokenPlain, hashRefreshToken, verifyRefreshToken } from "src/common/utils/token.util";


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

            if (provider === AuthProvider.CREDENTIALS) {
                if (!password) {
                    throw new BadRequestException('Password is required');
                }
                hashedPassword = await bcrypt.hash(password, 10);
            }

            const existing = await this.prisma.user.findUnique({
                where: { email },
            });

            if (existing) {
                throw new ConflictException('A user with this email already exists');
            }

            if (phone) {
                const phoneUser = await this.prisma.user.findFirst({
                    where: { phone },
                });

                if (phoneUser) {
                    throw new BadRequestException('Phone number already in use');
                }
            }

            // ✅ TRANSACTION START
            const user = await this.prisma.$transaction(async (tx) => {
                // 1️⃣ Create User
                const createdUser = await tx.user.create({
                    data: {
                        name,
                        email,
                        phone: phone ?? null,
                        password: hashedPassword,
                        role: role ?? Roles.STUDENT,
                        provider,
                        isEmailVerified: true,
                        isPhoneVerified: true,
                    },
                });

                // 2️⃣ Create Role-specific document
                if (createdUser.role === Roles.STUDENT) {
                    await tx.student.create({
                        data: {
                            userId: createdUser.id,
                        },
                    });
                }

                if (createdUser.role === Roles.TUTOR) {
                    await tx.tutor.create({
                        data: {
                            userId: createdUser.id,
                        },
                    });
                }

                // ❌ ADMIN → nothing extra
                return createdUser;
            });

            return user;
        } catch (error) {
            if (error instanceof HttpException) throw error;
            throw new InternalServerErrorException('Internal server error');
        }
    }



    async signin(dto: SigninDto) {
        try {
            const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (!user) throw new NotFoundException('User not found');

            if (user.provider !== AuthProvider.CREDENTIALS) {
                throw new BadRequestException(`This account uses ${user.provider}`);
            }

            if (!user.isEmailVerified && !user.isPhoneVerified) {
                throw new BadRequestException('Please complete verification');
            }

            if (user.role !== dto.role) {
                throw new BadRequestException('User associated with another account');
            }

            if (!user.password) {
                throw new BadRequestException('Password login not available');
            }

            const isPasswordValid = await bcrypt.compare(dto.password, user.password);
            if (!isPasswordValid) throw new BadRequestException('Invalid email or password');

            // create access token
            const payload = { id: user.id, email: user.email, role: user.role };
            const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '30m' });

            // create refresh token plain & hashed, save on user with expiry (e.g., 30 days)
            const refreshPlain = generateRefreshTokenPlain();
            const hashed = await hashRefreshToken(refreshPlain);
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 30 days

            await this.prisma.user.update({
                where: { id: user.id },
                data: { hashedRefreshToken: hashed, refreshTokenExpiresAt: expiresAt },
            });

            // return accessToken + user + refreshPlain (we will set cookie in controller / proxy)
            return {
                accessToken,
                refreshToken: refreshPlain,
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


    async refreshTokens(userId: string, refreshPlain: string) {

        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.hashedRefreshToken) {
            throw new BadRequestException('Invalid refresh token');
        }

        // check expiry
        if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
            // expiry or not set
            // clear stored token
            await this.prisma.user.update({ where: { id: userId }, data: { hashedRefreshToken: null, refreshTokenExpiresAt: null } });
            throw new BadRequestException('Refresh token expired');
        }

        const isValid = await verifyRefreshToken(refreshPlain, user.hashedRefreshToken);
        if (!isValid) {
            // possible theft: clear stored token
            await this.prisma.user.update({ where: { id: userId }, data: { hashedRefreshToken: null, refreshTokenExpiresAt: null } });
            throw new BadRequestException('Invalid refresh token');
        }

        // rotate: create new refresh token and update user
        const newRefreshPlain = generateRefreshTokenPlain();
        const newHashed = await hashRefreshToken(newRefreshPlain);
        const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await this.prisma.user.update({
            where: { id: userId },
            data: { hashedRefreshToken: newHashed, refreshTokenExpiresAt: newExpiresAt },
        });

        // new access token
        const payload = { sub: user.id, email: user.email, role: user.role };
        const newAccessToken = await this.jwtService.signAsync(payload, { expiresIn: '15m' });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshPlain,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name,
                avatar: user.avatar
            }
        };
    }

    // signout: clear refresh token for user
    async signout(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { hashedRefreshToken: null, refreshTokenExpiresAt: null },
        });
        return { ok: true };
    }
}

