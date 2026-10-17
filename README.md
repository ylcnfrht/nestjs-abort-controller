# nestjs-abort-controller

[![npm version](https://badge.fury.io/js/nestjs-abort-controller.svg)](https://badge.fury.io/js/nestjs-abort-controller)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Graceful request cancellation support for NestJS using native `AbortController`. Automatically handles client disconnections and provides easy-to-use decorators for request-scoped cancellation.

## ✨ Features

- 🚀 **Automatic AbortController Creation**: Creates `AbortSignal` for each incoming HTTP request
- 🔄 **Client Disconnection Handling**: Automatically aborts long-running operations when client disconnects
- 🎯 **Easy Integration**: Simple decorator-based approach with `@NestAbortSignal()`
- ⚡ **Lightweight**: No runtime dependencies beyond NestJS itself
- 🔌 **Express and Fastify**: Works with both HTTP adapters
- 🔧 **TypeScript Support**: Full TypeScript support with proper type definitions
- 🛡️ **Error Handling**: Built-in utilities for checking abort status, plus an optional filter that answers timeouts with `408 Request Timeout`
- ⏰ **Configurable Timeout**: Set request timeout in **milliseconds** to automatically abort long-running operations
- 📝 **Logging Support**: Optional logging for debugging abort scenarios

## 📦 Installation

```bash
npm install nestjs-abort-controller
```

## 🚀 Quick Start

### 1. Import the Module

```typescript
import { Module } from '@nestjs/common';
import { AbortControllerModule } from 'nestjs-abort-controller';

@Module({
  imports: [
    AbortControllerModule.forRoot({
      timeout: 30000, // 30000ms = 30 seconds timeout
      enableLogging: true,
    }),
  ],
})
export class AppModule {}
```

### 2. Use the Decorator

```typescript
import { Controller, Get } from '@nestjs/common';
import { NestAbortSignal, throwIfAborted } from 'nestjs-abort-controller';

@Controller('api')
export class ApiController {
  @Get('long-running-operation')
  async longRunningOperation(@NestAbortSignal() signal: AbortSignal): Promise<string> {
    for (let i = 0; i < 100; i++) {
      // Check if operation was aborted
      throwIfAborted(signal);

      // Your long-running work here
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return 'Operation completed successfully!';
  }
}
```

## 📚 API Reference

### Decorators

#### `@NestAbortSignal()`

A parameter decorator that injects the `AbortSignal` for the current request.

```typescript
@Get()
async handler(@NestAbortSignal() signal: AbortSignal) {
  // signal is automatically aborted when client disconnects
}
```

### Utility Functions

#### `throwIfAborted(signal: AbortSignal, message?: string): void`

Throws an `AbortError` if the signal is aborted.

```typescript
import { throwIfAborted } from 'nestjs-abort-controller';

async function longRunningOperation(signal: AbortSignal) {
  for (let i = 0; i < 1000; i++) {
    throwIfAborted(signal); // Will throw if aborted

    // Your work here
    await someAsyncWork();
  }
}
```

#### `AbortError`

Custom error class for abort operations. The middleware aborts the signal with an `AbortError` as its
`reason`, so `error.reason` tells you why the request was cancelled: `'timeout'` or `'client-disconnected'`.
`fetch` and other APIs that take a signal reject with that same error.

```typescript
import { AbortError } from 'nestjs-abort-controller';

try {
  // Some operation
} catch (error) {
  if (error instanceof AbortError) {
    console.log('Operation was aborted:', error.reason);
  }
}
```

### Error responses

By default an `AbortError` thrown from a handler goes through Nest's normal error handling (`500`, or your own
exception filters). Register the optional `AbortExceptionFilter` to get proper status codes instead:

```typescript
import { APP_FILTER } from '@nestjs/core';
import { AbortControllerModule, AbortExceptionFilter } from 'nestjs-abort-controller';

@Module({
  imports: [AbortControllerModule.forRoot()],
  providers: [{ provide: APP_FILTER, useClass: AbortExceptionFilter }],
})
export class AppModule {}
```

| Cause | Response |
| --- | --- |
| `timeout` (or a manual abort) | `408 Request Timeout` |
| `client-disconnected` | nothing is sent (the client is gone), nothing is logged as an error |

### Accessing the signal outside controllers

The middleware stores the controller and signal on the Node request under symbol keys, so they never clash
with other libraries. Use them in guards, interceptors or custom middleware:

```typescript
import { ABORT_SIGNAL } from 'nestjs-abort-controller';

const req = context.switchToHttp().getRequest();
const signal: AbortSignal = req[ABORT_SIGNAL] ?? req.raw?.[ABORT_SIGNAL]; // req.raw on Fastify
```

### `AbortControllerModule`

The main module that sets up the middleware for all routes.

#### `forRoot(options?: AbortControllerOptions)`

Configure the module for all routes.

```typescript
import { AbortControllerModule } from 'nestjs-abort-controller';

@Module({
  imports: [
    AbortControllerModule.forRoot({
      timeout: 30000, // 30000ms = 30 seconds
      enableLogging: true,
    }),
  ],
})
export class AppModule {}
```

#### `forRoutes(routes: string | string[], options?: AbortControllerOptions)`

Configure the module for specific routes.

```typescript
import { AbortControllerModule } from 'nestjs-abort-controller';

@Module({
  imports: [
    AbortControllerModule.forRoutes(['/api/*path'], { // NestJS 11 wildcard syntax ('/api/*' still works with a warning)
      timeout: 60000, // 60000ms = 60 seconds
      enableLogging: false,
    }),
  ],
})
export class AppModule {}
```

### Configuration Options

#### `AbortControllerOptions`

```typescript
interface AbortControllerOptions {
  timeout?: number; // Timeout duration in milliseconds (default: 30000ms = 30 seconds, 0 disables it)
  enableLogging?: boolean; // Enable debug logging (default: false)
}
```

## 🔧 Advanced Usage

### Using with Services

The recommended approach is to pass the `AbortSignal` from controller to service methods.

```typescript
import { Injectable } from '@nestjs/common';
import { throwIfAborted } from 'nestjs-abort-controller';

@Injectable()
export class UserService {
  async getUsers(signal: AbortSignal) {
    for (let i = 0; i < 100; i++) {
      throwIfAborted(signal);
      await someAsyncWork();
    }
    return users;
  }
}

import { Controller, Get } from '@nestjs/common';
import { NestAbortSignal } from 'nestjs-abort-controller';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  getUsers(@NestAbortSignal() signal: AbortSignal) {
    // Pass signal to service
    return this.userService.getUsers(signal);
  }
}
```

### Integration with External APIs

```typescript
import { Injectable } from '@nestjs/common';

@Injectable()
export class ExternalApiService {
  async fetchFromExternalApi(signal: AbortSignal) {
    const response = await fetch('https://api.example.com/data', {
      signal, // Pass the signal to fetch
    });

    return response.json();
  }
}

import { Controller, Get } from '@nestjs/common';
import { NestAbortSignal } from 'nestjs-abort-controller';

@Controller('api')
export class ApiController {
  constructor(private externalApiService: ExternalApiService) {}

  @Get('external-data')
  async getExternalData(@NestAbortSignal() signal: AbortSignal) {
    return this.externalApiService.fetchFromExternalApi(signal);
  }
}
```

### Manual Abort Signal Checking

```typescript
import { Controller, Get } from '@nestjs/common';
import { NestAbortSignal, throwIfAborted } from 'nestjs-abort-controller';

@Controller('api')
export class ApiController {
  @Get('manual-check')
  async manualCheck(@NestAbortSignal() signal: AbortSignal) {
    for (let i = 0; i < 1000; i++) {
      // Manual check
      if (signal.aborted) {
        throw new Error('Operation was cancelled');
      }

      // Or use utility function
      throwIfAborted(signal);

      await someAsyncWork();
    }
  }
}
```

### Error Handling

```typescript
import { Controller, Get } from '@nestjs/common';
import { NestAbortSignal, throwIfAborted, AbortError } from 'nestjs-abort-controller';

@Controller('api')
export class ApiController {
  @Get('with-error-handling')
  async withErrorHandling(@NestAbortSignal() signal: AbortSignal) {
    try {
      for (let i = 0; i < 100; i++) {
        throwIfAborted(signal);
        await someAsyncWork();
      }
      return 'Success';
    } catch (error) {
      if (error instanceof AbortError) {
        // Handle abort specifically
        return 'Operation was cancelled';
      }
      throw error;
    }
  }
}
```

### Multiple Service Calls

```typescript
import { Injectable } from '@nestjs/common';
import { throwIfAborted } from 'nestjs-abort-controller';

@Injectable()
export class DataService {
  async processData(signal: AbortSignal) {
    throwIfAborted(signal);
    // Process data
    return processedData;
  }
}

@Injectable()
export class CacheService {
  async getFromCache(signal: AbortSignal) {
    throwIfAborted(signal);
    // Get from cache
    return cachedData;
  }
}

import { Controller, Get } from '@nestjs/common';
import { NestAbortSignal } from 'nestjs-abort-controller';

@Controller('data')
export class DataController {
  constructor(
    private dataService: DataService,
    private cacheService: CacheService
  ) {}

  @Get('process')
  async processData(@NestAbortSignal() signal: AbortSignal) {
    // Use same signal for multiple service calls
    const cached = await this.cacheService.getFromCache(signal);
    const processed = await this.dataService.processData(signal);

    return { cached, processed };
  }
}
```

## 🧪 Testing

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { AbortControllerModule } from 'nestjs-abort-controller';

describe('AbortController', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [AbortControllerModule.forRoot()],
    }).compile();
  });

  // Your tests here
});
```

## 📋 Requirements

- Node.js >= 16.0.0 (NestJS 11 itself requires Node.js >= 20)
- NestJS >= 11.0.0 (Express or Fastify adapter)

## ⬆️ Upgrading to 1.3

No code changes are needed to upgrade from 1.2 to 1.3.

**Fixed**

- Requests with a body (POST/PUT/PATCH) no longer abort the signal as soon as the body is read; the signal is now
  aborted only when the client really disconnects or the timeout is hit.
- Options passed to `forRoot()` / `forRoutes()` no longer leak between calls.

**New**

- Fastify adapter support.
- `AbortError.reason` (`'timeout'` | `'client-disconnected'`) and the signal's `reason` tell you why a request was cancelled.
- Optional `AbortExceptionFilter` (see [Error responses](#error-responses)).
- `ABORT_SIGNAL` / `ABORT_CONTROLLER` symbol keys for reading the signal outside controllers.

**Deprecated** (still work, will be removed in 2.0)

- `req.abortSignal` / `req.abortController`: use `@NestAbortSignal()` or `req[ABORT_SIGNAL]` /
  `req[ABORT_CONTROLLER]` (see above).
- `AbortControllerMiddleware.setOptions()`: options now come from `forRoot()` / `forRoutes()` via DI;
  to use the middleware manually, pass them to the constructor: `new AbortControllerMiddleware({ timeout: 5000 })`.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built for the NestJS community
- Inspired by the need for better request cancellation handling
- Uses native Node.js AbortController for maximum compatibility

---

**Made with ❤️ for the NestJS community**
