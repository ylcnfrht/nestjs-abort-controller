# nestjs-abort-controller

[![npm version](https://img.shields.io/npm/v/nestjs-abort-controller.svg)](https://www.npmjs.com/package/nestjs-abort-controller)
[![npm downloads](https://img.shields.io/npm/dw/nestjs-abort-controller.svg)](https://www.npmjs.com/package/nestjs-abort-controller)
[![Docs](https://img.shields.io/badge/docs-nestjs--abort--controller.ferhatyalcin.dev-f43f5e.svg)](https://nestjs-abort-controller.ferhatyalcin.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Request cancellation for NestJS. Every HTTP request gets its own native `AbortSignal` that aborts when the
**client disconnects** or the request runs past its **timeout**, so database queries, `fetch` calls and loops stop
instead of finishing for nobody. Works with Express and Fastify.

**📖 Documentation: [nestjs-abort-controller.ferhatyalcin.dev](https://nestjs-abort-controller.ferhatyalcin.dev)**

## Features

- **One `AbortSignal` per request**, created by a middleware the module registers for you
- **Client disconnects** abort the signal; finished responses and POST bodies never do
- **Per-request timeout** (default 30 s, per module or per route group, `0` disables it)
- **`@NestAbortSignal()`** decorator to inject the signal into handlers
- **`AbortError` with a reason**: `'timeout'` or `'client-disconnected'`
- **`throwIfAborted()`** checkpoint for loops and code that takes no signal
- **Optional `AbortExceptionFilter`**: `408 Request Timeout` for timeouts, no response for clients that left
- **Express and Fastify**, no runtime dependencies

## Installation

```bash
npm install nestjs-abort-controller
```

Requires NestJS 11 (`@nestjs/platform-express` or `@nestjs/platform-fastify`).

## Quick start

```typescript
import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AbortControllerModule, AbortExceptionFilter } from 'nestjs-abort-controller';

@Module({
  imports: [AbortControllerModule.forRoot({ timeout: 30_000 })],
  providers: [{ provide: APP_FILTER, useClass: AbortExceptionFilter }], // optional: 408 instead of 500
})
export class AppModule {}
```

```typescript
import { Controller, Get, Param } from '@nestjs/common';
import { NestAbortSignal, throwIfAborted } from 'nestjs-abort-controller';

@Controller('users')
export class UsersController {
  @Get(':id')
  async findOne(@Param('id') id: string, @NestAbortSignal() signal: AbortSignal) {
    const res = await fetch(`https://api.example.com/users/${id}`, { signal }); // cancelled with the request
    return res.json();
  }

  @Get()
  async importAll(@NestAbortSignal() signal: AbortSignal) {
    for (const item of await this.items()) {
      throwIfAborted(signal); // stop between units of work
      await this.process(item);
    }
  }
}
```

The signal only helps where something listens to it: pass it on to `fetch`, `HttpService`, database drivers,
`fs/promises`, or check it with `throwIfAborted()`. See
[Services and external calls](https://nestjs-abort-controller.ferhatyalcin.dev/guides/services/).

## API

### `AbortControllerModule`

```typescript
AbortControllerModule.forRoot(options?);                    // all routes
AbortControllerModule.forRoutes(['/api/*path'], options?);  // only these routes (NestJS 11 wildcard syntax)
```

```typescript
interface AbortControllerOptions {
  timeout?: number;        // ms, default 30000; 0 disables the timer
  enableLogging?: boolean; // default false; logs via Nest's Logger (debug + warn)
}
```

> The default timeout is **on** (30 s). Streaming, SSE, long polling or upload routes usually need a larger value or
> `0`. Use one `forRoutes()` per route group for different limits.
> [Timeouts](https://nestjs-abort-controller.ferhatyalcin.dev/concepts/timeouts/)

### `@NestAbortSignal()`

Parameter decorator that injects the request's `AbortSignal` (`undefined` on routes the middleware does not cover).

### `AbortError` and `throwIfAborted(signal, message?)`

The middleware aborts the signal with an `AbortError` as its `reason`; `error.reason` is `'timeout'` or
`'client-disconnected'`. `fetch` rejects with that same error, and `throwIfAborted()` rethrows it.

```typescript
try {
  await fetch(url, { signal });
} catch (error) {
  if (error instanceof AbortError) console.log('cancelled:', error.reason);
  throw error;
}
```

Node core APIs (`fs/promises`, `timers/promises`, `stream.pipeline`) reject with Node's own `AbortError` and put
the reason in `error.cause`.
[AbortError and throwIfAborted](https://nestjs-abort-controller.ferhatyalcin.dev/concepts/abort-errors/)

### `AbortExceptionFilter`

| Cause | Response |
| --- | --- |
| `timeout` (or an `AbortError` without a reason) | `408 Request Timeout` |
| `client-disconnected` | nothing is sent (the client is gone), nothing is logged as an error |

Without it, an `AbortError` that escapes a handler becomes a `500`.
[Error responses](https://nestjs-abort-controller.ferhatyalcin.dev/concepts/error-responses/)

### Outside controllers: `ABORT_SIGNAL` / `ABORT_CONTROLLER`

The middleware stores the controller and signal on the Node request under symbol keys. Use them in guards,
interceptors or your own middleware:

```typescript
import { ABORT_SIGNAL } from 'nestjs-abort-controller';

const req = context.switchToHttp().getRequest();
const signal: AbortSignal = req[ABORT_SIGNAL] ?? req.raw?.[ABORT_SIGNAL]; // req.raw on Fastify
```

Full reference: [API docs](https://nestjs-abort-controller.ferhatyalcin.dev/api/overview/) ·
[Cheat sheet](https://nestjs-abort-controller.ferhatyalcin.dev/reference/cheat-sheet/)

## Testing

Services take the signal as a parameter, so unit tests pass their own:

```typescript
const controller = new AbortController();
controller.abort(new AbortError('test', 'client-disconnected'));
await expect(service.list(controller.signal)).rejects.toBeInstanceOf(AbortError);
```

End-to-end tests for disconnects and timeouts: [Testing](https://nestjs-abort-controller.ferhatyalcin.dev/guides/testing/).

## Upgrading from 1.2 to 1.3

No code changes are needed. 1.3 fixed POST/PUT/PATCH requests aborting as soon as their body was read, fixed
options leaking between `forRoot()` / `forRoutes()` calls, and added Fastify support, `AbortError.reason`,
`AbortExceptionFilter` and the `ABORT_SIGNAL` / `ABORT_CONTROLLER` symbols.

Deprecated (still work, removed in 2.0): `req.abortSignal`, `req.abortController` and
`AbortControllerMiddleware.setOptions()`. Details: [1.2 → 1.3](https://nestjs-abort-controller.ferhatyalcin.dev/migration/1-2-to-1-3/).

## Contributing

Issues and pull requests are welcome. Run `npm run lint && npm test` before opening a PR.
The docs site lives in [`site/`](site/) (Astro + Starlight).

## Author

**Ferhat Yalçın**

- Website: [nestjs-abort-controller.ferhatyalcin.dev](https://nestjs-abort-controller.ferhatyalcin.dev)
- Portfolio: [ferhatyalcin.dev](https://ferhatyalcin.dev)
- GitHub: [@ylcnfrht](https://github.com/ylcnfrht)
- ☕ [Buy me a coffee](https://buymeacoffee.com/ylcnfrht) if this package saves you time

## License

MIT, see [LICENSE](LICENSE).
