export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const MIN_LEVEL =
  LEVEL_SEVERITY[(process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || 'info'] ?? 20;

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  context: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    message: string;
    stack?: string;
  };
}

export class Logger {
  constructor(private readonly context: string) {}

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>,
    err?: unknown,
  ): void {
    if (LEVEL_SEVERITY[level] < MIN_LEVEL) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
    };

    if (data && Object.keys(data).length > 0) {
      entry.data = data;
    }

    if (err instanceof Error) {
      entry.error = {
        message: err.message,
        stack: err.stack,
      };
    } else if (err) {
      entry.error = { message: String(err) };
    }

    const line = JSON.stringify(entry);
    if (level === 'error') {
      process.stderr.write(`${line}\n`);
    } else {
      process.stdout.write(`${line}\n`);
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>, err?: unknown): void {
    this.log('warn', message, data, err);
  }

  error(message: string, err?: unknown, data?: Record<string, unknown>): void {
    this.log('error', message, data, err);
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}
