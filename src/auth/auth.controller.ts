import { Controller, Post, Body, Res, Req, Get, BadRequestException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from "./auth.service";
import { Public } from "src/common/decorator/public.decorator";
import { SigninDto, SignupDto } from "./dtos/auth.dto";

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
    @Post('signin')
    async signin(@Body() dto: SigninDto, @Res({ passthrough: true }) res: Response) {
        const { accessToken, refreshToken, user } = await this.authService.signin(dto);

        // set httpOnly refresh cookie (refreshToken is plaintext; store hashed in DB)
        res.cookie('sm_refresh', JSON.stringify({ userId: user.id, t: refreshToken }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        // return access token in body (client stores in memory or localStorage temporarily)
        return { accessToken, user };
    }



    @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookie = req.cookies['sm_refresh'];
    if (!cookie) throw new BadRequestException('No refresh token');

    let parsed: { userId: string; t: string };
    try {
      parsed = JSON.parse(cookie);
    } catch {
      throw new BadRequestException('Invalid refresh cookie');
    }

    const { userId, t } = parsed;

    const { accessToken, refreshToken: newRefresh, user } = await this.authService.refreshTokens(userId, t);

    // rotate cookie: set new refresh (plaintext) as hashed stored in DB by service
    res.cookie('sm_refresh', JSON.stringify({ userId: user.id, t: newRefresh }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return { accessToken, user };
  }



  @Post('signout')
  async signout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const cookie = req.cookies['sm_refresh'];
    if (cookie) {
      try {
        const parsed = JSON.parse(cookie);
        if (parsed?.userId) {
          await this.authService.signout(parsed.userId);
        }
      } catch {}
    }

    // clear cookie
    res.clearCookie('sm_refresh', { path: '/' });
    return { ok: true };
  }



  // optional profile endpoint (protected by JwtAuthGuard normally)
  @Get('profile')
  async profile(@Req() req: Request) {
    // implement jwt guard in real app; for now assume you have user in request
    // or fetch user by id from token payload
    return { user: req['user'] || null };
  }
}