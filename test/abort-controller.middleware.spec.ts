import { EventEmitter } from 'events';
import { AbortControllerMiddleware } from '../src/abort-controller.middleware';
import { AbortControllerRequest } from '../src/types';
import { ABORT_CONTROLLER, ABORT_SIGNAL } from '../src/constants';

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

  it('should abort on timeout', (done) => {
    AbortControllerMiddleware.setOptions({ timeout: 10, enableLogging: false }); // 10ms timeout
    const fakeReq: any = { on: jest.fn() };
    const fakeRes: any = { on: jest.fn() };
    const fakeNext = jest.fn();
    middleware.use(fakeReq, fakeRes, fakeNext);
    setTimeout(() => {
      expect(fakeReq[ABORT_CONTROLLER].signal.aborted).toBe(true);
      done();
    }, 20);
  });
});
