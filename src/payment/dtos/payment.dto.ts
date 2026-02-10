import { IsNotEmpty, IsString } from "class-validator";

export class PaymentVerifyDto{
    @IsString()
    @IsNotEmpty()
    orderId: string

    @IsString()
    @IsNotEmpty()
    razorpay_order_id: string

    @IsString()
    @IsNotEmpty()
    razorpay_payment_id: string

    @IsString()
    @IsNotEmpty()
    razorpay_signature: string
}