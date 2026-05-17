import { appendFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

const LOGS_DIR = join(process.cwd(), "logs");
const LOG_FILE = join(LOGS_DIR, "app.log");

function ensureLogsDir() {
  try {
    if (!existsSync(LOGS_DIR)) {
      mkdirSync(LOGS_DIR, { recursive: true });
    }
  } catch {
    // 忽略构建时或无写入权限环境的错误
  }
}

function formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` | meta: ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level}] ${message}${metaStr}`;
}

function writeLog(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const formatted = formatMessage(level, message, meta);

  // 1. 输出到控制台（带颜色）
  if (level === "ERROR") {
    console.error(`\x1b[31m${formatted}\x1b[0m`);
  } else if (level === "WARN") {
    console.warn(`\x1b[33m${formatted}\x1b[0m`);
  } else if (level === "DEBUG") {
    console.log(`\x1b[36m${formatted}\x1b[0m`);
  } else {
    console.log(`\x1b[32m${formatted}\x1b[0m`);
  }

  // 2. 写入到本地日志文件
  try {
    ensureLogsDir();
    appendFileSync(LOG_FILE, formatted + "\n", "utf8");
  } catch {
    // 忽略只读文件系统的报错
  }
}

export const logger = {
  info: (msg: string, meta?: Record<string, unknown>) => writeLog("INFO", msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => writeLog("WARN", msg, meta),
  error: (msg: string, err?: unknown, meta?: Record<string, unknown>) => {
    let errorMsg = msg;
    if (err instanceof Error) {
      errorMsg += `: ${err.message}\nStack: ${err.stack}`;
    } else if (err) {
      errorMsg += `: ${JSON.stringify(err)}`;
    }
    writeLog("ERROR", errorMsg, meta);
  },
  debug: (msg: string, meta?: Record<string, unknown>) => writeLog("DEBUG", msg, meta),
};
