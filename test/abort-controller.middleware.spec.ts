import { EventEmitter } from 'events';
import { AbortControllerMiddleware } from '../src/abort-controller.middleware';
import { AbortControllerRequest } from '../src/types';
import { ABORT_CONTROLLER, ABORT_SIGNAL } from '../src/constants';
import { AbortError } from '../src/throw-if-aborted';

describe('AbortControllerMiddleware', () => {
  let middleware: AbortControllerMiddleware;
  let req: Partial<AbortControllerRequest>;
  let res: any;
  let next: jest.Mock;

  beforeEach(() => {
    middleware = new AbortControllerMiddleware();
    req = { on: jest.fn() };
    res = { on: jest.fn() };
    next = jest.fn();
  });

  it('should attach abortController and abortSignal to request', () => {
    middleware.use(req as any, res, next);
    expect(req[ABORT_CONTROLLER]).toBeDefined();
    expect(req[ABORT_SIGNAL]).toBeDefined();
    expect(next).toHaveBeenCalled();
  });

  it('should register close event handler', () => {
    const fakeReq: any = { on: jest.fn() };
    const fakeRes: any = { on: jest.fn() };
    const fakeNext = jest.fn();
    middleware.use(fakeReq, fakeRes, fakeNext);
    // Check that the close event handler was registered
    expect(fakeRes.on).toHaveBeenCalledWith('close', expect.any(Function));
    expect(fakeNext).toHaveBeenCalled();
  });

  it('should abort when response closes before finishing (client disconnect)', () => {
    const fakeReq: any = new EventEmitter();
    const fakeRes: any = new EventEmitter();
    middleware.use(fakeReq, fakeRes, jest.fn());
    fakeReq.emit('close'); // fires once the body is read, must not abort
    expect(fakeReq[ABORT_SIGNAL].aborted).toBe(false);
    fakeRes.emit('close');
    expect(fakeReq[ABORT_SIGNAL].aborted).toBe(true);
  });

  it('should not abort when response finished normally', () => {
    const fakeReq: any = new EventEmitter();
    const fakeRes: any = new EventEmitter();
    middleware.use(fakeReq, fakeRes, jest.fn());
    fakeRes.emit('finish');
    fakeRes.emit('close');
    expect(fakeReq[ABORT_SIGNAL].aborted).toBe(false);
  });

  it('should abort on timeout with a timeout reason', (done) => {
    const timed = new AbortControllerMiddleware({ timeout: 10, enableLogging: false }); // 10ms timeout
    const fakeReq: any = { on: jest.fn() };
    const fakeRes: any = { on: jest.fn() };
    const fakeNext = jest.fn();
    timed.use(fakeReq, fakeRes, fakeNext);
    setTimeout(() => {
      const signal: AbortSignal = fakeReq[ABORT_CONTROLLER].signal;
      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBeInstanceOf(AbortError);
      expect(signal.reason.reason).toBe('timeout');
      done();
    }, 20);
  });

  it('should mark client disconnects with a client-disconnected reason', () => {
    const fakeReq: any = new EventEmitter();
    const fakeRes: any = new EventEmitter();
    middleware.use(fakeReq, fakeRes, jest.fn());
    fakeRes.emit('close');
    expect(fakeReq[ABORT_SIGNAL].reason.reason).toBe('client-disconnected');
  });

  it('should still expose deprecated req.abortSignal / req.abortController', () => {
    const fakeReq: any = { on: jest.fn() };
    middleware.use(fakeReq, { on: jest.fn() } as any, jest.fn());
    expect(fakeReq.abortSignal).toBe(fakeReq[ABORT_SIGNAL]);
    expect(fakeReq.abortController).toBe(fakeReq[ABORT_CONTROLLER]);
  });

  it('should honour deprecated setOptions() for instances created without options', (done) => {
    AbortControllerMiddleware.setOptions({ timeout: 10 });
    const fakeReq: any = { on: jest.fn() };
    middleware.use(fakeReq, { on: jest.fn() } as any, jest.fn());
    AbortControllerMiddleware.setOptions({});
    setTimeout(() => {
      expect(fakeReq[ABORT_SIGNAL].aborted).toBe(true);
      done();
    }, 20);
  });

  it('should keep options per instance', () => {
    const a = new AbortControllerMiddleware({ timeout: 0 });
    const b = new AbortControllerMiddleware({ timeout: 5 });
    expect((a as any).options.timeout).toBe(0);
    expect((b as any).options.timeout).toBe(5);
  });
});
