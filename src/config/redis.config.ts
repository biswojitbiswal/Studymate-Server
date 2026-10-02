import IORedis from "ioredis";

export const connection = new IORedis({
  host: process.env.ENV === "PROD" ? process.env.REDIS_HOST : "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  db: Number(process.env.REDIS_DB) || 1,
  maxRetriesPerRequest: null,
});