import { Worker } from "bullmq";
import IORedis from "ioredis";
import { sendEmail } from "common/utils/send-email.util";
import crypto from "crypto";


const connection = new IORedis({
  host: process.env.ENV === "PROD" ? process.env.REDIS_HOST : "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: null,
});

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
          console.log("Duplicate email skipped");
          return;
        }

        await sendEmail(to, subject, html);

        // 📝 Mark as sent (TTL = 1 hour)
        await connection.set(key, "1", "EX", 60 * 60);

        break;
      }

      case "sms": {
        const { to, message } = job.data;
        console.log(`Sending SMS to ${to}: ${message}`);
        break;
      }

      case "push": {
        const { to, title, body } = job.data;
        console.log(`Sending Push to ${to}: ${title} - ${body}`);
        break;
      }

      default:
        throw new Error(`Unknown job type: ${job.name}`);
    }

    console.log(`[${job.name}] completed successfully`);
  },
  { connection, concurrency: 3 }
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

console.log("Worker is running...");