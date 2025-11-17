import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ABORT_SIGNAL } from './constants';

export const NestAbortSignal = createParamDecorator((_, ctx: ExecutionContext): AbortSignal => {
  const req = ctx.switchToHttp().getRequest();
  return req[ABORT_SIGNAL];
});
