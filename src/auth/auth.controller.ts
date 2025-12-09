import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { Public } from "src/common/decorator/public.decorator";
import { SigninDto, SignupDto } from "./dtos/auth.dto";

@Controller({
    path: 'auth',
    version: '1'
})
export class AuthController{
    constructor(private readonly authService: AuthService){}


    @Public()
    @Post('signup')
    async signup(@Body() dto: SignupDto){
        return await this.authService.signup(dto)
    }


    @Public()
    @Post('signin')
    async signin(@Body() dto: SigninDto){
        return await this.authService.signin(dto)
    }
}