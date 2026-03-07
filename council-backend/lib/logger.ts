export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogContext {
  component?: string;
  session_id?: string;
  request_id?: string;
  [key: string]: unknown;
}

function log(level: LogLevel, message: string, context: LogContext = {}): void {
  const entry = {
    timestamp: new Date().toISOString(),
    log_level: level,
    message,
    ...context,
    // Lambda request ID from env (set at invocation time if needed)
    aws_request_id: process.env._X_AMZN_TRACE_ID ?? undefined,
  };
  const out = JSON.stringify(entry);
  if (level === "ERROR" || level === "WARN") {
    console.error(out);
  } else {
    console.log(out);
  }
}

export const logger = {
  debug: (message: string, ctx?: LogContext) => log("DEBUG", message, ctx),
  info: (message: string, ctx?: LogContext) => log("INFO", message, ctx),
  warn: (message: string, ctx?: LogContext) => log("WARN", message, ctx),
  error: (message: string, ctx?: LogContext) => log("ERROR", message, ctx),
};
