import { Controller, Post, Body, Res, Req, Get, BadRequestException, UnauthorizedException, Param, Query, Patch, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import type { Response, Request, CookieOptions } from 'express';
import { AuthService } from "./auth.service";
import { Public } from "src/common/decorator/public.decorator";
import { ChangePasswordDto, ForgotDto, ResetForgotPasswordDto, SigninDto, SignupDto, UpdateProfileDto } from "./dtos/auth.dto";
import { AuthGuard } from 'src/common/guards/auth.guard';
import { GetCurrentUserId } from 'src/common/decorator/get-current-user-id.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

const refreshCookieOptions = (expiresAt?: Date): CookieOptions => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  ...(expiresAt
    ? { maxAge: Math.max(0, expiresAt.getTime() - Date.now()) }
    : {}),
});

@Controller({
  path: 'auth',
  version: '1'
})
export class AuthController {
  constructor(private readonly authService: AuthService) { }


  @Public()
  @Post('signup')
  async signup(@Body() dto: SignupDto) {
    return await this.authService.signup(dto)
  }


  @Public()
  @Post('verify-email/:token')
  async emailverification(@Param('token') token: string) {
    return await this.authService.emailverification(token)
  }


  @Public()
  @Post('signin')
  async signin(@Body() dto: SigninDto, @Res({ passthrough: true }) res: Response) {
    const {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
      sessionId,
      user,
    } = await this.authService.signin(dto);

    // set httpOnly refresh cookie (refreshToken is plaintext; store hashed in DB)
    res.cookie(
      'sm_refresh',
      JSON.stringify({ sessionId, t: refreshToken }),
      refreshCookieOptions(refreshTokenExpiresAt),
    );

    // Return the short-lived access token; the frontend keeps it in memory.
    return { accessToken, user };
  }



  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const cookie = req.cookies['sm_refresh'];
      if (!cookie) throw new UnauthorizedException('No refresh token');

      let parsed: { sessionId?: string; t?: string };
      try {
        parsed = JSON.parse(cookie);
      } catch {
        throw new BadRequestException('Invalid refresh cookie');
      }

      const { sessionId, t } = parsed;
      if (!sessionId || !t) {
        throw new BadRequestException('Invalid refresh cookie');
      }

      const {
        accessToken,
        refreshToken: newRefresh,
        refreshTokenExpiresAt,
        user,
      } = await this.authService.refreshTokens(sessionId, t);

      res.cookie(
        'sm_refresh',
        JSON.stringify({ sessionId, t: newRefresh }),
        refreshCookieOptions(refreshTokenExpiresAt),
      );

      return { accessToken, user };
    } catch (error) {
      if (error instanceof BadRequestException) {
        res.clearCookie('sm_refresh', refreshCookieOptions());
      }
      throw error;
    }
  }



  @Public()
  @Post('signout')
  async signout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookie = req.cookies['sm_refresh'];
    if (cookie) {
      try {
        const parsed = JSON.parse(cookie);
        if (parsed?.sessionId) {
          await this.authService.signout(parsed.sessionId);
        }
      } catch { }
    }

    // clear cookie
    res.clearCookie('sm_refresh', refreshCookieOptions());
    return { ok: true };
  }


  @Public()
  @Post('forgot-password')
  async forgotpassword(@Body() dto: ForgotDto) {
    return await this.authService.forgotPassword(dto.email)
  }


  @Public()
  @Post('reset-password')
  async resetPassword(
    @Query('token') token: string,
    @Body() dto: ResetForgotPasswordDto,
  ) {
    return await this.authService.resetPassword(dto, token)
  }


  @UseGuards(AuthGuard)
  @Patch('change-password')
  async changePassword(
    @GetCurrentUserId() userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    return await this.authService.changePassword(userId, dto)
  }


  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('toggle/:userId')
  async toggle(
    @Param('userId') userId: string,
  ) {
    return await this.authService.toggle(userId)
  }


  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('avatar'))
  @Patch(':userId')
  async update(
    @Param('userId') userId: string,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return await this.authService.update(userId, dto, file)
  }
}
