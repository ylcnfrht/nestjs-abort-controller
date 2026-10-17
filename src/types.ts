import { Request } from 'express';
import { ABORT_CONTROLLER, ABORT_SIGNAL } from './constants';

export interface AbortControllerRequest extends Request {
  [ABORT_CONTROLLER]?: AbortController;
  [ABORT_SIGNAL]?: AbortSignal;
}

export interface AbortControllerOptions {
  timeout?: number; // Timeout duration in milliseconds (default: 30000ms = 30 seconds)
  enableLogging?: boolean;
}
