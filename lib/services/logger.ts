type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 50
};

function getLogLevel(): LogLevel {
  const configuredLevel = process.env.LOG_LEVEL?.toLowerCase();
  if (
    configuredLevel === 'debug' ||
    configuredLevel === 'info' ||
    configuredLevel === 'warn' ||
    configuredLevel === 'error' ||
    configuredLevel === 'silent'
  ) {
    return configuredLevel;
  }

  return 'info';
}

function shouldLog(level: Exclude<LogLevel, 'silent'>): boolean {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[getLogLevel()];
}

export const logger = {
  debug: (...args: unknown[]): void => {
    if (shouldLog('debug')) {
      console.debug(...args);
    }
  },
  info: (...args: unknown[]): void => {
    if (shouldLog('info')) {
      console.info(...args);
    }
  },
  warn: (...args: unknown[]): void => {
    if (shouldLog('warn')) {
      console.warn(...args);
    }
  },
  error: (...args: unknown[]): void => {
    if (shouldLog('error')) {
      console.error(...args);
    }
  }
};

