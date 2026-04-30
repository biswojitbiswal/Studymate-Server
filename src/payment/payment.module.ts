import { Module } from "@nestjs/common";
import { PrismaModule } from "src/prisma/prisma.module";
import { PaymentController } from "./payment.controller";
import { PaymentService } from "./payment.service";
import { CouponModule } from "src/coupon/coupon.module";
import { ClassEnrollmentModule } from "src/class-enrollment/class-enrollment.module";
import { PayoutModule } from "payout/payout.module";

@Module({
    imports: [PrismaModule, CouponModule, ClassEnrollmentModule, PayoutModule],
    controllers: [PaymentController],
    providers: [PaymentService],
    exports: [PaymentService]
})
export class PaymentModule{}