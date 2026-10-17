import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ABORT_SIGNAL } from './constants';

export const NestAbortSignal = createParamDecorator((_, ctx: ExecutionContext): AbortSignal => {
  const req = ctx.switchToHttp().getRequest();
  // Fastify wraps the Node request the middleware saw in `req.raw`
  return req[ABORT_SIGNAL] ?? req.raw?.[ABORT_SIGNAL];
});
