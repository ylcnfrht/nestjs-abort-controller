import { throwIfAborted, AbortError } from '../src/throw-if-aborted';

describe('AbortError', () => {
  it('should create AbortError with default message', () => {
    const error = new AbortError();
    expect(error.message).toBe('Operation was aborted');
    expect(error.name).toBe('AbortError');
  });

  it('should create AbortError with custom message', () => {
    const error = new AbortError('Custom abort message');
    expect(error.message).toBe('Custom abort message');
    expect(error.name).toBe('AbortError');
  });
});

describe('throwIfAborted', () => {
  it('should not throw when signal is not aborted', () => {
    const controller = new AbortController();
    expect(() => throwIfAborted(controller.signal)).not.toThrow();
  });

  it('should throw AbortError when signal is aborted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal)).toThrow(AbortError);
  });

  it('should throw with custom message when signal is aborted', () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => throwIfAborted(controller.signal, 'Custom message')).toThrow('Custom message');
  });

  it('should rethrow the AbortError used as the abort reason', () => {
    const controller = new AbortController();
    const reason = new AbortError('Request timed out', 'timeout');
    controller.abort(reason);
    expect(() => throwIfAborted(controller.signal)).toThrow(reason);
  });

  it('should keep the reason when a custom message is given', () => {
    const controller = new AbortController();
    controller.abort(new AbortError('x', 'client-disconnected'));
    try {
      throwIfAborted(controller.signal, 'Custom message');
    } catch (e) {
      expect((e as AbortError).message).toBe('Custom message');
      expect((e as AbortError).reason).toBe('client-disconnected');
    }
    expect.assertions(2);
  });
});
