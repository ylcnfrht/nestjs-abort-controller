import { Request } from 'express';
import { ABORT_CONTROLLER, ABORT_SIGNAL } from './constants';

// Kept as express Request for 1.x type compatibility; at runtime Fastify passes the plain Node request
export interface AbortControllerRequest extends Request {
  [ABORT_CONTROLLER]?: AbortController;
  [ABORT_SIGNAL]?: AbortSignal;
  /** @deprecated Use `req[ABORT_CONTROLLER]`. Will be removed in 2.0. */
  abortController?: AbortController;
  /** @deprecated Use `@NestAbortSignal()` or `req[ABORT_SIGNAL]`. Will be removed in 2.0. */
  abortSignal?: AbortSignal;
}

export interface AbortControllerOptions {
  timeout?: number; // Timeout duration in milliseconds (default: 30000ms = 30 seconds, 0 disables it)
  enableLogging?: boolean;
}

export interface AbortControllerModuleOptions extends AbortControllerOptions {
  routes?: string | string[];
}
