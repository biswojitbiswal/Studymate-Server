import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { CouponModule } from "src/coupon/coupon.module";
import { PaymentModule } from "src/payment/payment.module";

@Module({
    imports: [PrismaModule, CouponModule, PaymentModule],
    controllers: [OrderController],
    providers: [OrderService]
})
export class OrderModule{}