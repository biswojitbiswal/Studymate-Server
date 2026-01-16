import { Controller, Post, Body, Res, Req, Get, BadRequestException, UnauthorizedException, Param, Query, Patch, UseGuards } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from "./auth.service";
import { Public } from "src/common/decorator/public.decorator";
import { ChangePasswordDto, ForgotDto, ResetForgotPasswordDto, SigninDto, SignupDto } from "./dtos/auth.dto";
import { AuthGuard } from 'src/common/guards/auth.guard';
import { GetCurrentUserId } from 'src/common/decorator/get-current-user-id.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorator/roles.decorator';

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
  async emailverification(@Param() token: string) {
    return await this.authService.emailverification(token)
  }


  @Public()
  @Post('signin')
  async signin(@Body() dto: SigninDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.signin(dto);

    // set httpOnly refresh cookie (refreshToken is plaintext; store hashed in DB)
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie(
      'sm_refresh',
      JSON.stringify({ userId: user.id, t: refreshToken }),
      {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax', // 🔑 KEY LINE
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    );

    // return access token in body (client stores in memory or localStorage temporarily)
    return { accessToken, user };
  }



  @Public()
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {

    const cookie = req.cookies['sm_refresh'];
    console.log("🔥 REFRESH API HIT", req.headers.cookie);
    if (!cookie) throw new UnauthorizedException('No refresh token');
    console.log(cookie, "=================");


    let parsed: { userId: string; t: string };
    try {
      parsed = JSON.parse(cookie);
    } catch {
      throw new BadRequestException('Invalid refresh cookie');
    }

    const { userId, t } = parsed;

    const { accessToken, refreshToken: newRefresh, user } = await this.authService.refreshTokens(userId, t);

    // rotate cookie: set new refresh (plaintext) as hashed stored in DB by service
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie(
      'sm_refresh',
      JSON.stringify({ userId: user.id, t: newRefresh }),
      {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? 'none' : 'lax', // 🔑 KEY LINE
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    );



    return { accessToken, user };
  }



  @Public()
  @Post('signout')
  async signout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookie = req.cookies['sm_refresh'];
    if (cookie) {
      try {
        const parsed = JSON.parse(cookie);
        if (parsed?.userId) {
          await this.authService.signout(parsed.userId);
        }
      } catch { }
    }

    // clear cookie
    res.clearCookie('sm_refresh', { path: '/' });
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
}