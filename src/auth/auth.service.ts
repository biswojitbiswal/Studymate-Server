import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { ChangePasswordDto, ResetForgotPasswordDto, SigninDto, SignupDto } from "./dtos/auth.dto";
import { AuthProvider, Roles, SignupIntent } from '@prisma/client'
import * as bcrypt from 'bcrypt';
import { JwtService } from "@nestjs/jwt";
import { generateRefreshTokenPlain, hashRefreshToken, verifyRefreshToken } from "src/common/utils/token.util";
import { EmailService } from "src/mail/mail.service";
import { verificationEmailHtml } from "src/common/emails/verification-email";
import { forgotPasswordEmailHtml } from "src/common/emails/forgot-password";


@Injectable({})
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private jwtService: JwtService,
        private readonly email: EmailService
    ) { }

    private buildEmailVerificationUrl(token: string) {
        const base = process.env.ENV === 'PROD' ? process.env.FRONT_END_URL?.replace(/\/$/, '') : 'http://localhost:5173';
        // Point this endpoint to your controller that verifies the token
        return `${base}/verify-email/${encodeURIComponent(token)}`;
    }

    async signup(dto: SignupDto) {
        const { name, email, phone, password, signupIntent, provider } = dto;

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

        if (existing && !existing.isEmailVerified) {
            await this.prisma.user.update({
                where: { id: existing.id },
                data: {
                    name,
                    phone: phone ?? existing.phone,
                    password: hashedPassword ?? existing.password,
                    signupIntent,
                },
            });

            const payload = {
                id: existing.id,
                email: existing.email,
            }

            const token = await this.jwtService.signAsync(payload, {
                secret: process.env.JWT_SECRET,
                expiresIn: '1d',
            })

            const verifyUrl = this.buildEmailVerificationUrl(token);
            const html = verificationEmailHtml(verifyUrl)

            // 🔔 resend verification email here
            await this.email.sendEmail(existing.email, "Verify Your Email", html);

            return {
                message: 'Verification email resent. Please verify your email.',
            };
        }

        if (existing && existing.isEmailVerified) {
            throw new ConflictException('Account already exists. Please sign in.');
        }

        if (phone) {
            const phoneUser = await this.prisma.user.findFirst({
                where: { phone },
            });
            if (phoneUser) {
                throw new BadRequestException('Phone number already in use');
            }
        }

        const user = await this.prisma.$transaction(async (tx) => {
            const createdUser = await tx.user.create({
                data: {
                    name,
                    email,
                    phone: phone ?? null,
                    password: hashedPassword,
                    role: Roles.STUDENT,              // 🔒 forced
                    signupIntent,                     // STUDENT | TUTOR
                    provider,
                    isEmailVerified: false,
                },
            });

            await tx.student.create({
                data: {
                    userId: createdUser.id,
                },
            });


            return createdUser;
        });

        // 5️⃣ Send verification email
        const payload = {
            id: user.id,
            email: user.email,
        }

        const token = await this.jwtService.signAsync(payload, {
            secret: process.env.JWT_SECRET,
            expiresIn: '1d',
        })

        const verifyUrl = this.buildEmailVerificationUrl(token);
        const html = verificationEmailHtml(verifyUrl)

        // 🔔 resend verification email here
        await this.email.sendEmail(user.email, "Verify Your Email", html);

        return {
            message: 'Signup successful. Please verify your email.',
        };
    }


    async emailverification(token: string) {
        try {
            const decode = await this.jwtService.verifyAsync(token, {
                secret: process.env.JWT_SECRET
            })
            if (!decode || !decode.id) throw new BadRequestException("Invalid or Expired token");

            const user = await this.prisma.user.findUnique({
                where: { id: decode.id }
            })
            if (!user) {
                throw new NotFoundException("User Not Found");
            }

            if (user.email !== decode.email) {
                throw new BadRequestException("Email verification mismatch");
            }

            if (user.isEmailVerified) {
                throw new BadRequestException("Email is already verified");
            }

            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    isEmailVerified: true
                },
            });

            return { message: "Email Verified Successfully" };
        } catch (error) {
            throw error;
        }
    }


    async signin(dto: SigninDto) {
        try {
            const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (!user) throw new NotFoundException('User not found');

            if (user.provider !== AuthProvider.CREDENTIALS) {
                throw new BadRequestException(`This account uses ${user.provider}`);
            }

            if (!user.isEmailVerified) {
                throw new BadRequestException('Please complete verification');
            }

            if (!user.password) {
                throw new BadRequestException('Password login not available');
            }

            const isPasswordValid = await bcrypt.compare(dto.password, user.password);
            if (!isPasswordValid) throw new BadRequestException('Invalid email or password');

            // create access token
            const payload = { id: user.id, email: user.email, role: user.role };
            const accessToken = await this.jwtService.signAsync(payload, { expiresIn: '30m' });

            // create refresh token plain & hashed, save on user with expiry (e.g., 7 days)
            const refreshPlain = generateRefreshTokenPlain();
            const hashed = await hashRefreshToken(refreshPlain);
            const expiresAt = dto.rememberMe ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

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


    async signout(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { hashedRefreshToken: null, refreshTokenExpiresAt: null },
        });
        return { ok: true };
    }


    async changePassword(userId: string, dto: ChangePasswordDto) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId },
            })

            if (!user) {
                throw new NotFoundException("user not found")
            }

            if (!user.password) {
                throw new BadRequestException(
                    'Password change not available for social login accounts'
                );
            }

            const passwordMatch = await bcrypt.compare(dto.oldPassword, user?.password)


            if (!passwordMatch) {
                throw new BadRequestException('Invalid credentials')
            }

            const hashedPassword = await bcrypt.hash(dto.newPassword, 10);

            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashedPassword
                }
            })

            return {
                message: 'Password changed successfully',
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            throw new InternalServerErrorException('Internal server error')
        }
    }


    async forgotPassword(email: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { email }
            })

            if (!user) {
                return {
                    message: 'If an account exists, a reset link has been sent',
                };
            }


            const payload = {
                id: user.id,
                email: user.email,
            }

            const token = await this.jwtService.signAsync(payload, {
                secret: process.env.FORGOT_SECRET,
                expiresIn: '15m',
            })

            const base = process.env.ENV === 'PROD' ? process.env.FRONT_END_URL?.replace(/\/$/, '') : 'http://localhost:5173';
            const resetLink = `${base}/forgot-password/${token}`;
            const html = forgotPasswordEmailHtml(user.name ?? 'User', resetLink)

            await this.email.sendEmail(user.email, "Reset Password", html)

            return {
                message: 'Resent link sent successfully',
            }
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new InternalServerErrorException('Internal server error');
        }
    }


    async resetPassword(dto: ResetForgotPasswordDto, token: string) {
        try {
            const { newPassword } = dto;

            let payload: any;

            try {
                payload = this.jwtService.verify(token, {
                    secret: process.env.FORGOT_SECRET,
                });

            } catch (err) {
                throw new BadRequestException('Invalid or expired token');
            }

            const hashed = await bcrypt.hash(newPassword, 10);

            await this.prisma.user.update({
                where: { email: payload.email },
                data: { password: hashed },
            });

            return { message: "Reset password successful" };
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            throw new InternalServerErrorException('Internal server error');
        }
    }


    async toggle(userId: string) {
        try {
            const user = await this.prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user) {
                throw new NotFoundException('User not found');
            }

            const newStatus = !user.isActive;

            await this.prisma.user.update({
                where: { id: user.id },
                data: {
                    isActive: newStatus
                }
            });

            return {
                message: `User ${newStatus ? 'ACTIVATED' : 'DEACTIVATED'} successfully`
            };
        } catch (error) {
            throw error;
        }
    }
}

