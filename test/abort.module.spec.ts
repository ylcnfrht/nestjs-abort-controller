import { AbortControllerModule } from '../src/abort.module';
import { ABORT_CONTROLLER_OPTIONS } from '../src/constants';

const optionsOf = (mod: any) => mod.providers.find((p: any) => p.provide === ABORT_CONTROLLER_OPTIONS).useValue;

describe('AbortControllerModule', () => {
  it('should return dynamic module from forRoot', () => {
    const mod = AbortControllerModule.forRoot({ timeout: 123, enableLogging: true }); // 123ms timeout
    expect(mod).toHaveProperty('module', AbortControllerModule);
    expect(optionsOf(mod)).toEqual({ timeout: 123, enableLogging: true, routes: '*' });
  });

  it('should return dynamic module from forRoutes', () => {
    const mod = AbortControllerModule.forRoutes('/api', { timeout: 456 }); // 456ms timeout
    expect(mod).toHaveProperty('module', AbortControllerModule);
    expect(optionsOf(mod)).toEqual({ timeout: 456, routes: '/api' });
  });

  it('should not leak options between calls', () => {
    const a = AbortControllerModule.forRoot({ timeout: 1 });
    AbortControllerModule.forRoutes('/b', { timeout: 2 });
    expect(optionsOf(a).timeout).toBe(1);
  });
});
