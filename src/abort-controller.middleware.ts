import { Inject, Injectable, NestMiddleware, Logger, Optional } from '@nestjs/common';
import { ServerResponse } from 'http';
import { AbortControllerOptions, AbortControllerRequest } from './types';
import { ABORT_CONTROLLER, ABORT_CONTROLLER_OPTIONS, ABORT_SIGNAL } from './constants';
import { AbortError } from './throw-if-aborted';

const LOG_MESSAGES = {
  CLIENT_DISCONNECTED: 'Client disconnected, aborting request',
  REQUEST_TIMEOUT: 'Request timeout after {timeout}ms',
  REQUEST_COMPLETED: 'Request completed successfully',
} as const;

@Injectable()
export class AbortControllerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AbortControllerMiddleware.name);
  private static legacyOptions: AbortControllerOptions = {};

  constructor(@Optional() @Inject(ABORT_CONTROLLER_OPTIONS) private readonly options?: AbortControllerOptions) {}

  /**
   * @deprecated Use `AbortControllerModule.forRoot()` / `forRoutes()` or `new AbortControllerMiddleware(options)`.
   * Only applies to instances created without options. Will be removed in 2.0.
   */
  static setOptions(options: AbortControllerOptions): void {
    AbortControllerMiddleware.legacyOptions = options;
  }

  use(req: AbortControllerRequest, res: ServerResponse, next: () => void): void {
    const controller = new AbortController();
    // read per request: setOptions() may be called after the instance was created
    const options = this.options ?? AbortControllerMiddleware.legacyOptions;

    // Timeout in milliseconds (default: 30000ms = 30 seconds)
    const timeout = options.timeout ?? 30000;
    const enableLogging = options.enableLogging ?? false;

    req[ABORT_CONTROLLER] = controller;
    req[ABORT_SIGNAL] = controller.signal;
    // deprecated 1.x properties, kept until 2.0
    req.abortController = controller;
    req.abortSignal = controller.signal;

    let requestFinished = false;

    res.on('close', () => {
      if (requestFinished || controller.signal.aborted) {
        return;
      }

      if (enableLogging) {
        this.logger.debug(LOG_MESSAGES.CLIENT_DISCONNECTED);
      }
      controller.abort(new AbortError('Client disconnected', 'client-disconnected'));
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
        controller.abort(new AbortError(`Request timed out after ${timeout}ms`, 'timeout'));
      }, timeout);

      res.on('close', () => clearTimeout(timeoutId));
      res.on('finish', () => clearTimeout(timeoutId));
    }

    next();
  }
}
