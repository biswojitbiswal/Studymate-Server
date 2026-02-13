import { Body, Controller, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { PaymentVerifyDto } from "./dtos/payment.dto";
import { Public } from "src/common/decorator/public.decorator";

@Controller({
    path: 'payments',
    version: '1'
})
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @UseGuards(AuthGuard)
    @Post("verify")
    async verifyPayment(@Body() dto: PaymentVerifyDto) {
        return await this.paymentService.verify(dto)
    }

    @Public()
    @Post('webhook')
    async handleWebhook(
        @Req() req: any,
        @Headers('x-razorpay-signature') signature: string,
    ){
        return await this.paymentService.handleWebhook(req.body, signature);
    }
}