import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { NestAbortSignal } from '../src/abort-signal.decorator';
import { ABORT_SIGNAL } from '../src/constants';

describe('NestAbortSignal', () => {
  it('should read the signal from the request symbol', () => {
    class TestController {
      handler(@NestAbortSignal() _signal: AbortSignal) {}
    }
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, TestController, 'handler');
    const { factory } = args[Object.keys(args)[0]];
    const signal = new AbortController().signal;
    const ctx: any = { switchToHttp: () => ({ getRequest: () => ({ [ABORT_SIGNAL]: signal }) }) };
    expect(factory(undefined, ctx)).toBe(signal);
  });
});
