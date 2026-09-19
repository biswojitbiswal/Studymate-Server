import * as dotenv from 'dotenv';
dotenv.config();
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { sendEmail } from "common/utils/send-email.util";
import crypto from "crypto";
import { InvoiceStatus, PrismaClient } from '@prisma/client';
import { generateInvoicePdf } from 'invoice/invoice-generator';


const connection = new IORedis({
  host: process.env.ENV === "PROD" ? process.env.REDIS_HOST : "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});
const prisma = new PrismaClient();

const worker = new Worker(
  "notification-queue",
  async (job) => {
    console.log(`[${job.name}] Processing:`, job.data);

    switch (job.name) {
      case "email": {
        const { to, subject, html } = job.data;

        if (!to || !subject || !html) {
          throw new Error("Invalid email payload");
        }

        const uniqueKey = crypto
          .createHash("sha256")
          .update(`${to}-${subject}`)
          .digest("hex");

        const key = `sent:${job.name}:${uniqueKey}`;

        // 🔍 Check if already sent
        const alreadySent = await connection.get(key);

        if (alreadySent) {
          // console.log("Duplicate email skipped");
          return;
        }

        await sendEmail(to, subject, html);

        // 📝 Mark as sent (TTL = 1 hour)
        await connection.set(key, "1", "EX", 60 * 60);

        break;
      }

      case "sms": {
        const { to, message } = job.data;
        // console.log(`Sending SMS to ${to}: ${message}`);
        break;
      }

      case "push": {
        const { to, title, body } = job.data;
        // console.log(`Sending Push to ${to}: ${title} - ${body}`);
        break;
      }

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }

    console.log(`[${job.name}] completed successfully`);
  },
  { connection, concurrency: 3 }
);

const invoiceWorker = new Worker(
  'invoice-queue',
  async (job) => {
    const invoiceId = String(job.data?.invoiceId ?? '');
    if (!invoiceId) throw new Error('Invalid invoice job payload');

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.PROCESSING,
        failureReason: null,
      },
    });

    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
      });
      if (!invoice) throw new Error('Invoice record not found');

      const issuedAt = new Date();
      const pdf = await generateInvoicePdf({
        invoiceNo: invoice.invoiceNo,
        issuedAt,
        issuer: invoice.issuerSnapshot as Record<string, any>,
        customer: invoice.customerSnapshot as Record<string, any>,
        item: invoice.itemSnapshot as Record<string, any>,
        payment: invoice.paymentSnapshot as Record<string, any>,
      });

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: InvoiceStatus.READY,
          issuedAt,
          pdfData: Uint8Array.from(pdf),
          failureReason: null,
        },
      });
    } catch (error) {
      const maxAttempts = job.opts.attempts ?? 1;
      const isLastAttempt = job.attemptsMade + 1 >= maxAttempts;
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          status: isLastAttempt ? InvoiceStatus.FAILED : InvoiceStatus.PENDING,
          failureReason:
            error instanceof Error ? error.message : 'Invoice generation failed',
        },
      });
      throw error;
    }
  },
  { connection, concurrency: 2 },
);

// ✅ listeners
worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(
    `Job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts.attempts}):`,
    err.message
  );
});

invoiceWorker.on('completed', (job) => {
  console.log(`Invoice job ${job.id} completed`);
});

invoiceWorker.on('failed', (job, err) => {
  console.error(
    `Invoice job ${job?.id} failed (attempt ${job?.attemptsMade}/${job?.opts.attempts}):`,
    err.message,
  );
});

console.log("Notification and invoice workers are running...");
