import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const SENSITIVE_KEYS = [
  'authorization',
  'cookie',
  'password',
  'secret',
  'token',
];

const PRIORITY_FIELDS = [
  'requestId',
  'method',
  'route',
  'status',
  'durationMs',
  'userId',
  'role',
  'ip',
  'error',
];

const isSensitiveKey = (key: string) =>
  SENSITIVE_KEYS.some((sensitiveKey) =>
    key.toLowerCase().includes(sensitiveKey),
  );

const serializeValue = (key: string, value: unknown): string => {
  if (isSensitiveKey(key)) {
    return '[REDACTED]';
  }

  if (typeof value === 'string') {
    return /\s/.test(value) ? JSON.stringify(value) : value;
  }

  if (value instanceof Error) {
    return JSON.stringify(value.message);
  }

  if (typeof value === 'object' && value !== null) {
    try {
      return JSON.stringify(value, (nestedKey, nestedValue) =>
        nestedKey && isSensitiveKey(nestedKey) ? '[REDACTED]' : nestedValue,
      );
    } catch {
      return '[Unserializable]';
    }
  }

  return String(value);
};

const readableLogFormat = winston.format.printf((info) => {
  const ignoredFields = new Set([
    'timestamp',
    'level',
    'message',
    'context',
    'stack',
  ]);
  const metadataKeys = Object.keys(info).filter(
    (key) => !ignoredFields.has(key) && info[key] !== undefined,
  );
  const orderedKeys = [
    ...PRIORITY_FIELDS.filter((key) => metadataKeys.includes(key)),
    ...metadataKeys.filter((key) => !PRIORITY_FIELDS.includes(key)).sort(),
  ];
  const metadata = orderedKeys
    .map((key) => `${key}=${serializeValue(key, info[key])}`)
    .join(' ');
  const context = info.context ? ` [${String(info.context)}]` : '';
  const stack = info.stack ? `\n${String(info.stack)}` : '';

  return `${String(info.timestamp)} ${String(info.level).toUpperCase().padEnd(5)}${context} ${String(info.message)}${metadata ? ` ${metadata}` : ''}${stack}`;
});

const createReadableFormat = (colorize = false) =>
  winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    ...(colorize ? [winston.format.colorize({ level: true })] : []),
    readableLogFormat,
  );

export const createWinstonTransports = () => {
  const level = process.env.LOG_LEVEL || 'info';

  const transportConsole = new winston.transports.Console({
    level,
    handleExceptions: true,
    handleRejections: true,
    format: createReadableFormat(true),
  });

  // Plain-text application logs can be opened directly in an editor.
  const transportFile = new DailyRotateFile({
    level,
    filename: 'logs/application-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '14d',
    handleExceptions: true,
    handleRejections: true,
    format: createReadableFormat(),
  });

  // Keep errors longer and make production incidents easy to locate.
  const transportErrorFile = new DailyRotateFile({
    level: 'error',
    filename: 'logs/error-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    zippedArchive: false,
    maxSize: '20m',
    maxFiles: '30d',
    format: createReadableFormat(),
  });

  return { transportConsole, transportFile, transportErrorFile };
};
