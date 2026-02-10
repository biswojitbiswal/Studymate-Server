import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { AuthGuard } from "src/common/guards/auth.guard";
import { PaymentVerifyDto } from "./dtos/payment.dto";

@Controller({
    path: 'payment',
    version: '1'
})
export class PaymentController{
    constructor(private readonly paymentService: PaymentService){}

    @UseGuards(AuthGuard)
    @Post("verify")
    async verifyPayment(@Body() dto: PaymentVerifyDto){
        return await this.paymentService.verify(dto)
    }
}