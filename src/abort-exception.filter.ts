import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AbortError } from './throw-if-aborted';

/**
 * Maps AbortError to HTTP: client disconnects get no response (nobody is listening),
 * everything else (timeouts, manual aborts) becomes 408 Request Timeout.
 */
@Catch(AbortError)
export class AbortExceptionFilter implements ExceptionFilter {
  constructor(private readonly adapterHost: HttpAdapterHost) {}

  catch(error: AbortError, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw error;
    }
    const { httpAdapter } = this.adapterHost;
    const ctx = host.switchToHttp();
    const res = ctx.getResponse();
    if (error.reason === 'client-disconnected' || httpAdapter.isHeadersSent(res)) {
      return;
    }
    httpAdapter.reply(
      res,
      { statusCode: HttpStatus.REQUEST_TIMEOUT, message: error.message, error: 'Request Timeout' },
      HttpStatus.REQUEST_TIMEOUT
    );
  }
}
