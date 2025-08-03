export interface StructuredError {
  code: string;
  message: string;
  context?: any;
  timestamp: string;
}

export class ErrorHandler {
  static createStructuredError(code: string, message: string, context?: any): StructuredError {
    return {
      code,
      message,
      context,
      timestamp: new Date().toISOString()
    };
  }

  static logError(error: StructuredError, logger: any): void {
    logger.error('Structured Error', {
      code: error.code,
      message: error.message,
      context: error.context,
      timestamp: error.timestamp
    });
  }

  static getHealthStatus(): any {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    };
  }
}