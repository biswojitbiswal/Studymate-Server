import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { OrderController } from "./order.controller";
import { OrderService } from "./order.service";
import { CouponModule } from "src/coupon/coupon.module";

@Module({
    imports: [PrismaModule, CouponModule],
    controllers: [OrderController],
    providers: [OrderService]
})
export class OrderModule{}