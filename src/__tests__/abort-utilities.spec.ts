import { throwIfAborted } from './abort-utilities';

describe('throwIfAborted', () => {
  let mockSignal: AbortSignal;

  beforeEach(() => {
    mockSignal = {
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      onabort: null,
      reason: undefined,
      throwIfAborted: jest.fn(),
    } as unknown as AbortSignal;
  });

  it('should not throw when signal is not aborted', () => {
    expect(() => throwIfAborted(mockSignal)).not.toThrow();
  });

  it('should throw default error message when signal is aborted and no custom message provided', () => {
    mockSignal.aborted = true;
    expect(() => throwIfAborted(mockSignal)).toThrow('Operation was aborted');
  });

  it('should throw custom error message when signal is aborted and custom message provided', () => {
    mockSignal.aborted = true;
    const customMessage = 'Custom abort message';
    expect(() => throwIfAborted(mockSignal, customMessage)).toThrow(customMessage);
  });

  it('should throw an Error instance when signal is aborted', () => {
    mockSignal.aborted = true;
    expect(() => throwIfAborted(mockSignal)).toThrow(Error);
  });

  it('should not throw when signal is not aborted even with custom message', () => {
    expect(() => throwIfAborted(mockSignal, 'Custom message')).not.toThrow();
  });
});