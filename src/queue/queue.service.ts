import { Injectable } from "@nestjs/common";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import crypto from "crypto";


export type NotificationJob =
    | {
        type: "email";
        to: string;
        subject: string;
        html: string;
        priority?: number;
        attempts?: number;
        delay?: number;
        backoffType?: "fixed" | "exponential";
        backoffDelay?: number;
    }
    | {
        type: "sms";
        to: string;
        message: string;
        priority?: number;
        attempts?: number;
        delay?: number;
        backoffType?: "fixed" | "exponential";
        backoffDelay?: number;
    }
    | {
        type: "push";
        to: string;
        title: string;
        body: string;
        priority?: number;
        attempts?: number;
        delay?: number;
        backoffType?: "fixed" | "exponential";
        backoffDelay?: number;
    };

@Injectable()
export class QueueService {
    private notificationQueue: Queue;
    private invoiceQueue: Queue;

    constructor() {
        const connection = new IORedis({
            host: process.env.ENV === "PROD" ? process.env.REDIS_HOST : "localhost",
            port: Number(process.env.REDIS_PORT) || 6379,
            maxRetriesPerRequest: null,
        });

        this.notificationQueue = new Queue("notification-queue", { connection });
        this.invoiceQueue = new Queue("invoice-queue", { connection });
    }



    async addNotificationJob(data: NotificationJob) {

        // console.log(data, "==============");
        
        let uniqueString = "";

        switch (data.type) {
            case "email":
                uniqueString = `${data.type}-${data.to}-${data.subject}-${data.html}`;
                break;

            case "sms":
                uniqueString = `${data.type}-${data.to}-${data.message}`;
                break;

            case "push":
                uniqueString = `${data.type}-${data.to}-${data.title}-${data.body}`;
                break;
        }

        const jobId = crypto
            .createHash("sha256")
            .update(uniqueString)
            .digest("hex");

        await this.notificationQueue.add(data.type, data, {
            jobId,
            priority: (data as any).priority ?? 1,
            attempts: (data as any).attempts ?? 3,
            delay: (data as any).delay ?? 0,
            backoff: {
                type: (data as any).backoffType ?? "fixed",
                delay: (data as any).backoffDelay ?? 3000,
            },
        });
    }

    async addInvoiceJob(invoiceId: string) {
        await this.invoiceQueue.add(
            "generate-invoice",
            { invoiceId },
            {
                jobId: `invoice-${invoiceId}`,
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
                removeOnComplete: true,
                removeOnFail: true,
            },
        );
    }
}
