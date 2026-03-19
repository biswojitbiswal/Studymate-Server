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
            console.log(orderId, " --------------");

            const order = await this.prisma.order.findUnique({
                where: { id: orderId }
            })
            console.log(order);

            if (!order) throw new NotFoundException("Order not found");

            if (order.status !== OrderStatus.PENDING) throw new BadRequestException("Order is not payable")

            const amountInPaise = Math.round(order.totalAmount * 100);

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


    async handleWebhook(rawBody: Buffer, signature: string) {
        const webhookSecret = this.config.get('RAZORPAY_WEBHOOK_SECRET');

        if (!webhookSecret) {
            console.error('RAZORPAY_WEBHOOK_SECRET missing');
            return { received: true }; // never crash webhook
        }


        try {
            // 1️⃣ Verify signature
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(rawBody)
                .digest('hex');

            if (expectedSignature !== signature) {
                console.log('❌ Invalid Razorpay signature');
                return { received: true }; // NEVER throw
            }

            // 2️⃣ Parse event
            const event = JSON.parse(rawBody.toString());

            console.log('WEBHOOK EVENT:', event.event);

            const paymentEntity = event?.payload?.payment?.entity;

            if (!paymentEntity) {
                console.log('⚠️ No payment entity in webhook');
                return { received: true };
            }
            console.log(paymentEntity);


            const paymentId = paymentEntity.id;
            const orderId = paymentEntity.order_id;

            // 3️⃣ IDEMPOTENCY CHECK (VERY IMPORTANT)
            const existingTransaction = await this.prisma.transaction.findFirst({
                where: { providerPaymentId: paymentId },
            });

            if (existingTransaction) {
                console.log('⚠️ Duplicate webhook ignored:', paymentId);
                return { received: true };
            }
            // console.log(existingTransaction);

            // 4️⃣ Process event
            switch (event.event) {
                case 'payment.captured':
                    await this.handlePaymentSuccess(paymentEntity);
                    break;

                case 'payment.failed':
                    await this.handlePaymentFailed(paymentEntity);
                    break;

                default:
                    console.log('Ignored event:', event.event);
            }

            return { received: true };
        } catch (error) {
            // VERY IMPORTANT
            // NEVER allow webhook to crash
            console.error('Webhook processing error:', error);
            return { received: true };
        }
    }




    async handlePaymentSuccess(payment: any) {
        console.log("payment success webhook reached");

        const razorpayOrderId = payment.order_id;
        const razorpayPaymentId = payment.id;

        const transaction = await this.prisma.transaction.findFirst({
            where: { providerOrderId: razorpayOrderId },
            include: { order: true }
        });

        if (!transaction) {
            console.log("No transaction found for order:", razorpayOrderId);
            return;
        }

        // already processed safety
        if (transaction.status === PaymentStatus.SUCCESS) {
            console.log("Transaction already processed");
            return;
        }

        await this.prisma.$transaction(async (tx) => {

            // store payment id (VERY IMPORTANT)
            await tx.transaction.update({
                where: { id: transaction.id },
                data: {
                    providerPaymentId: razorpayPaymentId,
                    status: PaymentStatus.SUCCESS
                }
            });

            const order = await tx.order.update({
                where: { id: transaction.orderId },
                data: { status: OrderStatus.PAID }
            });

            await this.prisma.tuitionClass.update({
                where: {
                    id: order.productId
                },
                data: {
                    totalEnrolment: {
                        increment: 1
                    }
                }
            })

            await this.couponService.redeemCouponAfterPayment(tx, transaction.orderId);

            await this.classEnrollmentService.createEnrollmentFromOrder(tx, transaction.orderId);
        });

        console.log("Order marked paid and enrollment created");
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