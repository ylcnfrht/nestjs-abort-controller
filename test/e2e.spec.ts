import 'reflect-metadata';
import * as http from 'http';
import { Body, Controller, Get, INestApplication, Module, Post } from '@nestjs/common';
import { APP_FILTER, NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AbortControllerModule, AbortExceptionFilter, NestAbortSignal, throwIfAborted } from '../src';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
let seen: Record<string, boolean | undefined> = {};

@Controller()
class TestController {
  @Post('slow')
  async slow(@Body() _body: unknown, @NestAbortSignal() signal: AbortSignal) {
    await wait(100);
    seen.post = signal.aborted;
    return { ok: true };
  }

  @Get('gone')
  async gone(@NestAbortSignal() signal: AbortSignal) {
    await wait(150);
    seen.disconnect = signal.aborted;
    return 'late';
  }

  @Get('timeout')
  async timeout(@NestAbortSignal() signal: AbortSignal) {
    await wait(300);
    throwIfAborted(signal);
    return 'never';
  }
}

@Module({
  imports: [AbortControllerModule.forRoot({ timeout: 200 })],
  controllers: [TestController],
  providers: [{ provide: APP_FILTER, useClass: AbortExceptionFilter }],
})
class AppModule {}

function request(port: number, method: string, path: string, body?: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { port, method, path, headers: body ? { 'content-type': 'application/json' } : {} },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode!, body: data }));
      }
    );
    req.on('error', reject);
    req.end(body);
  });
}

describe.each([
  ['express', () => NestFactory.create(AppModule, { logger: false })],
  ['fastify', () => NestFactory.create(AppModule, new FastifyAdapter(), { logger: false })],
])('e2e (%s)', (_name, create) => {
  let app: INestApplication;
  let port: number;

  beforeAll(async () => {
    app = await create();
    await app.listen(0, '127.0.0.1');
    port = (app.getHttpServer().address() as { port: number }).port;
  });
  afterAll(() => app.close());
  beforeEach(() => (seen = {}));

  it('does not abort a POST with a body while the client is connected', async () => {
    const res = await request(port, 'POST', '/slow', '{"a":1}');
    expect(res.status).toBe(201);
    expect(seen.post).toBe(false);
  });

  it('aborts when the client disconnects', async () => {
    const req = http.request({ port, path: '/gone' });
    req.on('error', () => undefined);
    req.end();
    setTimeout(() => req.destroy(), 30);
    await wait(250);
    expect(seen.disconnect).toBe(true);
  });

  it('responds 408 on timeout', async () => {
    const res = await request(port, 'GET', '/timeout');
    expect(res.status).toBe(408);
    expect(JSON.parse(res.body)).toMatchObject({ statusCode: 408, error: 'Request Timeout' });
  });
});
