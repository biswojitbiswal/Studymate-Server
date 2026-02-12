import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Razorpay from "razorpay";
import { OrderStatus } from "src/common/enums/order.enum";
import { PaymentProvider, PaymentStatus, PaymentType } from "src/common/enums/payment.enum";
import { PrismaService } from "src/prisma/prisma.service";
import { PaymentVerifyDto } from "./dtos/payment.dto";
import * as crypto from 'crypto'
import { CouponService } from "src/coupon/coupon.service";
import { ClassEnrollmentService } from "src/class-enrollment/class-enrollment.service";

@Injectable({})
export class PaymentService {
    private razorpay: Razorpay
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService,
        private readonly couponService: CouponService,
        private readonly classEnrollmentService: ClassEnrollmentService
    ) {
        this.razorpay = new Razorpay({
            key_id: this.config.get<string>("RAZOR_PAY_API_KEY"),
            key_secret: this.config.get<string>("RAZOR_PAY_API_SECRET"),
        });
    }


    async createRazorpayOrder(orderId: string, userId: string) {
        try {
            const order = await this.prisma.order.findUnique({
                where: { id: orderId }
            })
            if (!order) throw new NotFoundException("Order not found");

            if (order.status !== OrderStatus.PENDING) throw new BadRequestException("Order is not payable")

            const amountInPaise = Math.round(order.taxAmount * 100);

            const razorpayOrder = await this.razorpay.orders.create({
                amount: amountInPaise,
                currency: "INR",
                receipt: order.orderNo,
                payment_capture: true,
            })

            const transaction = await this.prisma.transaction.create({
                data: {
                    userId,
                    orderId: order.id,
                    provider: PaymentProvider.RAZORPAY,
                    type: PaymentType.PAYMENT,
                    amount: order.totalAmount,
                    providerOrderId: razorpayOrder.id,
                    status: PaymentStatus.PENDING
                }
            })

            return {
                orderId: order.id,
                razorpayOrderId: razorpayOrder.id,
                amount: amountInPaise,
                currency: 'INR',
                keyId: this.config.get<string>("RAZOR_PAY_API_KEY"),
            }
        } catch (error) {
            throw error;
        }
    }


    async verify(dto: PaymentVerifyDto) {
        try {
            const transaction = await this.prisma.transaction.findFirst({
                where: { providerOrderId: dto.razorpay_order_id }
            })

            if (!transaction) throw new NotFoundException("Transaction not found");

            const body = dto.razorpay_order_id + "|" + dto.razorpay_payment_id;

            const expectedSignature = crypto.createHmac("sha256", this.config.getOrThrow<string>("RAZOR_PAY_API_SECRET"))
                .update(body.toString())
                .digest("hex");

            if (expectedSignature !== dto.razorpay_signature) {
                throw new BadRequestException("Invalid Pyament Signature")
            }

            await this.prisma.transaction.update({
                where: { id: transaction.id },
                data: {
                    providerPaymentId: dto.razorpay_payment_id,
                    providerSignature: dto.razorpay_signature
                }
            })

            return {
                message: "Payment Received, Waiting for confirmation"
            }
        } catch (error) {
            throw error;
        }
    }


    async handleWebhook(body: any, signature: string) {
        try {
            const expectedSignature = crypto
                .createHmac("sha256", this.config.getOrThrow<string>("RAZORPAY_WEBHOOK_SECRET"))
                .update(JSON.stringify(body))
                .digest("hex");

            if (expectedSignature !== signature) {
                throw new BadRequestException("Invalid payment signature");
            }

            const event = body.event;

            if (event === "payment.captured") {
                await this.handlePaymentSuccess(body);
            }

            if (event === "payment.failed") {
                await this.handlePaymentFailed(body);
            }

            return { status: "ok" };
        } catch (error) {
            throw error;
        }
    }



    async handlePaymentSuccess(payload: any) {
        try {
            const payment = payload.payload.payment.entity;
            const razorpayOrderId = payment.order_id;

            const transaction = await this.prisma.transaction.findFirst({
                where: { providerOrderId: razorpayOrderId },
                include: {
                    order: true
                }
            })
            if (!transaction) return;

            await this.prisma.$transaction(async (tx) => {
                if (transaction.status === PaymentStatus.SUCCESS) return;

                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: { status: PaymentStatus.SUCCESS }
                })

                await tx.order.update({
                    where: { id: transaction.orderId },
                    data: { status: OrderStatus.PAID }
                })

                await this.couponService.redeemCouponAfterPayment(tx, transaction.orderId);

                await this.classEnrollmentService.createEnrollmentFromOrder(tx, transaction.orderId);
            })
        } catch (error) {
            throw error;
        }
    }


    async handlePaymentFailed(payload: any) {
        try {
            const payment = payload.payload.payment.entity;
            const razorpayOrderId = payment.order_id;

            const transaction = await this.prisma.transaction.findFirst({
                where: { providerOrderId: razorpayOrderId },
                include: {
                    order: true
                }
            })
            if (!transaction) return;

            await this.prisma.$transaction(async (tx) => {

                await tx.transaction.update({
                    where: { id: transaction.id },
                    data: { status: PaymentStatus.FAILED }
                })

                await tx.order.update({
                    where: { id: transaction.orderId },
                    data: { status: OrderStatus.FAILED }
                })

                await this.couponService.releaseCouponAfterFailure(tx, transaction.orderId);

            })
        } catch (error) {
            throw error;
        }
    }
}