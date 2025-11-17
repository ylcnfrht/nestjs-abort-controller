import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AbortControllerOptions, AbortControllerRequest } from './types';

const LOG_MESSAGES = {
  CLIENT_DISCONNECTED: 'Client disconnected, aborting request',
  REQUEST_TIMEOUT: 'Request timeout after {timeout}ms',
  REQUEST_COMPLETED: 'Request completed successfully',
} as const;

@Injectable()
export class AbortControllerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AbortControllerMiddleware.name);
  private static options: AbortControllerOptions = {};

  static setOptions(options: AbortControllerOptions) {
    AbortControllerMiddleware.options = options;
  }

  use(req: AbortControllerRequest, res: Response, next: () => void) {
    const controller = new AbortController();

    // Timeout in milliseconds (default: 30000ms = 30 seconds)
    const timeout = AbortControllerMiddleware.options.timeout ?? 30000;
    const enableLogging = AbortControllerMiddleware.options.enableLogging ?? false;

    req.abortController = controller;
    req.abortSignal = controller.signal;

    let requestFinished = false;

    res.on('close', () => {
      if (requestFinished) {
        return;
      }
      
      if (enableLogging) {
        this.logger.debug(LOG_MESSAGES.CLIENT_DISCONNECTED);
      }
      controller.abort();
    });

    res.on('finish', () => {
      requestFinished = true;
      if (enableLogging) {
        this.logger.debug(LOG_MESSAGES.REQUEST_COMPLETED);
      }
    });

    if (timeout > 0) {
      const timeoutId = setTimeout(() => {
        if (enableLogging) {
          this.logger.warn(LOG_MESSAGES.REQUEST_TIMEOUT.replace('{timeout}', timeout.toString()));
        }
        controller.abort();
      }, timeout);

      res.on('close', () => clearTimeout(timeoutId));
      res.on('finish', () => clearTimeout(timeoutId));
    }

    next();
  }
}
