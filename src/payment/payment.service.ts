import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Razorpay from "razorpay";
import { OrderStatus } from "src/common/enums/order.enum";
import { PaymentProvider, PaymentStatus, PaymentType } from "src/common/enums/payment.enum";
import { PrismaService } from "src/prisma/prisma.service";
import { PaymentVerifyDto } from "./dtos/payment.dto";

@Injectable({})
export class PaymentService {
    private razorpay: Razorpay
    constructor(
        private readonly prisma: PrismaService,
        private readonly config: ConfigService
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


    async verify(dto: PaymentVerifyDto){
        try {
            const transaction = await this.prisma.transaction.findFirst({
                where: {providerOrderId: dto.razorpay_order_id}
            })

            if(!transaction) throw new NotFoundException("Transaction not found");

            const body = dto.razorpay_order_id + "|" + dto.razorpay_payment_id;
        } catch (error) {
            throw error;
        }
    }
}