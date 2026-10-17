import { Module, MiddlewareConsumer, NestModule, DynamicModule, Inject } from '@nestjs/common';
import { AbortControllerMiddleware } from './abort-controller.middleware';
import { ABORT_CONTROLLER_OPTIONS } from './constants';
import { AbortControllerModuleOptions, AbortControllerOptions } from './types';

@Module({})
export class AbortControllerModule implements NestModule {
  constructor(@Inject(ABORT_CONTROLLER_OPTIONS) private readonly options: AbortControllerModuleOptions) {}

  configure(consumer: MiddlewareConsumer): void {
    const routes = this.options.routes ?? '*';
    consumer.apply(AbortControllerMiddleware).forRoutes(...(Array.isArray(routes) ? routes : [routes]));
  }

  static forRoot(options?: AbortControllerOptions): DynamicModule {
    return AbortControllerModule.forRoutes('*', options);
  }

  static forRoutes(routes: string | string[] = '*', options?: AbortControllerOptions): DynamicModule {
    return {
      module: AbortControllerModule,
      providers: [{ provide: ABORT_CONTROLLER_OPTIONS, useValue: { ...options, routes } }, AbortControllerMiddleware],
    };
  }
}
