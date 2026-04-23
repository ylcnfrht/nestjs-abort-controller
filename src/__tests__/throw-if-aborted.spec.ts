import { AbortError, throwIfAborted } from './throw-if-aborted';

describe('throwIfAborted', () => {
  let mockSignal: AbortSignal;

  beforeEach(() => {
    mockSignal = {
      aborted: false,
      onabort: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    } as unknown as AbortSignal;
  });

  it('should not throw when signal is not aborted', () => {
    expect(() => throwIfAborted(mockSignal)).not.toThrow();
  });

  it('should throw AbortError when signal is aborted', () => {
    mockSignal.aborted = true;
    expect(() => throwIfAborted(mockSignal)).toThrow(AbortError);
  });

  it('should throw AbortError with default message when signal is aborted and no message provided', () => {
    mockSignal.aborted = true;
    expect(() => throwIfAborted(mockSignal)).toThrow('Operation was aborted');
  });

  it('should throw AbortError with custom message when signal is aborted and message is provided', () => {
    mockSignal.aborted = true;
    const customMessage = 'Custom abort message';
    expect(() => throwIfAborted(mockSignal, customMessage)).toThrow(customMessage);
  });

  it('should throw AbortError with custom message when signal is aborted and empty message is provided', () => {
    mockSignal.aborted = true;
    expect(() => throwIfAborted(mockSignal, '')).toThrow('');
  });

  it('should not throw when signal is not aborted even with custom message', () => {
    expect(() => throwIfAborted(mockSignal, 'Custom message')).not.toThrow();
  });

  it('should throw AbortError with correct name', () => {
    mockSignal.aborted = true;
    try {
      throwIfAborted(mockSignal);
    } catch (error) {
      expect(error).toBeInstanceOf(AbortError);
      expect((error as AbortError).name).toBe('AbortError');
    }
  });
});