import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InvoiceStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueueService } from 'src/queue/queue.service';
import { INVOICE_ISSUER } from './invoice.constants';

const CURRENT_TEMPLATE_VERSION = 2;

const invoiceSelect = {
  id: true,
  orderId: true,
  invoiceNo: true,
  status: true,
  templateVersion: true,
  issuedAt: true,
  failureReason: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async prepareForPaidOrder(orderId: string, userId?: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        ...(userId ? { userId } : {}),
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        transactions: {
          where: { status: PaymentStatus.SUCCESS },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
        invoice: {
          select: invoiceSelect,
        },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status !== OrderStatus.PAID) {
      throw new BadRequestException('Invoices are available only for paid orders');
    }

    if (
      order.invoice?.status === InvoiceStatus.READY &&
      order.invoice.templateVersion === CURRENT_TEMPLATE_VERSION
    ) {
      return order.invoice;
    }

    const product = await this.prisma.tuitionClass.findUnique({
      where: { id: order.productId },
      select: { title: true },
    });
    const payment = order.transactions[0];

    const invoice = await this.prisma.invoice.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        invoiceNo: `SN-INV-${order.orderNo}`,
        status: InvoiceStatus.PENDING,
        templateVersion: CURRENT_TEMPLATE_VERSION,
        issuerSnapshot: INVOICE_ISSUER,
        customerSnapshot: {
          name: order.user.name ?? 'Student',
          email: order.user.email,
          phone: order.user.phone,
        },
        itemSnapshot: {
          type: order.productType,
          title: product?.title ?? 'StudyNest purchase',
          productId: order.productId,
        },
        paymentSnapshot: {
          orderNo: order.orderNo,
          paymentId: payment?.providerPaymentId ?? null,
          provider: payment?.provider ?? null,
          basePrice: order.basePrice,
          discountAmount: order.discountAmount ?? 0,
          tax: order.tax,
          taxAmount: order.taxAmount,
          totalAmount: order.totalAmount,
          currency: payment?.currency ?? 'INR',
          paidAt: payment?.updatedAt ?? order.updatedAt,
        },
      },
      update: {
        status: InvoiceStatus.PENDING,
        templateVersion: CURRENT_TEMPLATE_VERSION,
        pdfData: null,
        failureReason: null,
      },
      select: invoiceSelect,
    });

    try {
      await this.queueService.addInvoiceJob(invoice.id);
    } catch (error) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: {
          status: InvoiceStatus.FAILED,
          failureReason: 'Could not queue invoice generation',
        },
      });
      throw new ServiceUnavailableException(
        'Invoice service is temporarily unavailable. Please try again.',
      );
    }
    return invoice;
  }

  async getForOrder(orderId: string, userId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      select: {
        id: true,
        status: true,
        invoice: { select: invoiceSelect },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    return {
      eligible: order.status === OrderStatus.PAID,
      invoice: order.invoice,
    };
  }

  async getPdf(orderId: string, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        orderId,
        order: { userId },
      },
      select: {
        invoiceNo: true,
        status: true,
        pdfData: true,
      },
    });

    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.status !== InvoiceStatus.READY || !invoice.pdfData) {
      throw new BadRequestException('Invoice is not ready yet');
    }

    return {
      fileName: `${invoice.invoiceNo}.pdf`,
      data: Buffer.from(invoice.pdfData),
    };
  }
}
