import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { CouponController } from "./coupon.controller";
import { CouponService } from "./coupon.service";

@Module({
    imports: [PrismaModule],
    controllers: [CouponController],
    providers: [CouponService],
    exports: [CouponService]
})
export class CouponModule{}