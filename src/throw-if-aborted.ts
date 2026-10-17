export type AbortReason = 'timeout' | 'client-disconnected';

export class AbortError extends Error {
  constructor(
    message: string = 'Operation was aborted',
    public readonly reason?: AbortReason
  ) {
    super(message);
    this.name = 'AbortError';
  }
}

export function throwIfAborted(signal: AbortSignal, message?: string): void {
  if (!signal.aborted) {
    return;
  }
  const reason = signal.reason instanceof AbortError ? signal.reason : undefined;
  if (reason && message === undefined) {
    throw reason;
  }
  throw new AbortError(message, reason?.reason);
}
