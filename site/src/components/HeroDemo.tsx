import { useEffect, useRef, useState } from 'preact/hooks';
// Pure TS, no Nest imports: the demo runs the library's real AbortError and throwIfAborted.
import { AbortError, throwIfAborted } from '../../../src/throw-if-aborted.ts';
import './demo.css';
import './widgets.css';
import './HeroDemo.css';

/** The snippet shown next to the output. The widget simulates the middleware and runs this handler loop. */
export const HERO_CODE = `@Module({
  imports: [AbortControllerModule.forRoot({ timeout: 1500 })],
  providers: [{ provide: APP_FILTER, useClass: AbortExceptionFilter }],
})
export class AppModule {}

@Controller('reports')
export class ReportController {
  @Get()
  async build(@NestAbortSignal() signal: AbortSignal) {
    for (const chunk of chunks) {   // 8 chunks, 250 ms each
      throwIfAborted(signal);       // stop as soon as nobody needs it
      await this.reports.render(chunk, { signal });
    }
    return { ok: true };
  }
}`;

const STEPS = 8;
const STEP_MS = 250;
const WINDOW_MS = 3200;

type Tone = 'dim' | 'ok' | 'timeout' | 'cancel' | 'callback';
interface Line { at: number; text: string; tone?: Tone }
type Phase = 'idle' | 'running' | 'ok' | 'timeout' | 'cancel';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Landing-page widget: one request through the middleware, racing its timeout and the client. */
export default function HeroDemo() {
  const [lines, setLines] = useState<Line[]>([]);
  const [phase, setPhase] = useState<Phase>('idle');
  const [timeout, setTimeoutMs] = useState(1500);
  const [filter, setFilter] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const controller = useRef<AbortController>();
  const t0 = useRef(0);
  const runId = useRef(0);
  const root = useRef<HTMLDivElement>(null);

  const now = () => Math.round(performance.now() - t0.current);

  async function run(ms = timeout, withFilter = filter) {
    const id = ++runId.current;
    const live = () => id === runId.current;
    const say = (text: string, tone?: Tone) => live() && setLines((l) => [...l, { at: now(), text, tone }]);
    controller.current?.abort();
    t0.current = performance.now();
    setLines([]);
    setElapsed(0);
    setPhase('running');

    // What AbortControllerMiddleware does for every request.
    const c = new AbortController();
    controller.current = c;
    const timer = ms > 0 ? setTimeout(() => c.abort(new AbortError(`Request timed out after ${ms}ms`, 'timeout')), ms) : undefined;
    c.signal.addEventListener('abort', () => say(`signal aborted  reason: '${(c.signal.reason as AbortError).reason}'`, 'callback'));
    say(`GET /reports  timeout ${ms > 0 ? `${ms} ms` : 'off'}`, 'dim');

    try {
      for (let i = 0; i < STEPS; i++) {
        throwIfAborted(c.signal);
        await sleep(STEP_MS);
      }
      say('200 OK  {"ok":true}', 'ok');
      if (live()) setPhase('ok');
    } catch (error) {
      if (!(error instanceof AbortError)) throw error;
      const timedOut = error.reason === 'timeout';
      if (!timedOut) say('client gone: nothing sent, nothing logged', 'cancel');
      else say(withFilter ? '408 Request Timeout' : '500 Internal Server Error  (no AbortExceptionFilter)', 'timeout');
      if (live()) setPhase(timedOut ? 'timeout' : 'cancel');
    } finally {
      clearTimeout(timer);
      if (live()) setElapsed(now());
    }
  }

  function disconnect() {
    controller.current?.abort(new AbortError('Client disconnected', 'client-disconnected'));
  }

  // Auto-play once, when scrolled into view.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) {
        io.disconnect();
        void run();
      }
    });
    io.observe(root.current!);
    return () => {
      io.disconnect();
      controller.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'running') return;
    let raf = requestAnimationFrame(function tick() {
      setElapsed(now());
      raf = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const total = STEPS * STEP_MS;
  const pct = (ms: number) => `${Math.min(100, (ms / WINDOW_MS) * 100)}%`;
  const running = phase === 'running';
  const fillKind = phase === 'timeout' ? 'timeout' : phase === 'cancel' ? 'cancel' : phase === 'ok' ? 'done' : undefined;

  return (
    <div class="io-hero-out io-demo" ref={root}>
      <div class="io-hero-head">
        <span class="io-hero-dots" aria-hidden="true"><i /><i /><i /></span>
        <span>live · real throwIfAborted, simulated request</span>
        <button type="button" class="io-hero-replay" onClick={() => void run()}>{running ? 'Restart' : 'Run'}</button>
      </div>
      <div class="io-hero-body">
        <div class="io-track" role="img" aria-label={`Handler progress ${elapsed} ms of ${total} ms`}>
          <div class="io-track-fill" data-k={fillKind} style={{ width: pct(Math.min(elapsed, total)) }} />
          <div class="io-mark" data-k="end" style={{ left: pct(total) }}><span>response</span></div>
          {timeout > 0 && (
            <div class="io-mark" data-flip={timeout > WINDOW_MS * 0.75 ? '' : undefined} style={{ left: pct(timeout) }}>
              <span>timeout</span>
            </div>
          )}
        </div>
        <div class="io-row io-hero-actions">
          <label class="io-check">
            timeout{' '}
            <select value={timeout} disabled={running} onChange={(e) => setTimeoutMs(Number((e.target as HTMLSelectElement).value))}>
              <option value={1500}>1500 ms</option>
              <option value={3000}>3000 ms</option>
              <option value={0}>0 (off)</option>
            </select>
          </label>
          <label class="io-check">
            <input type="checkbox" checked={filter} disabled={running} onChange={(e) => setFilter((e.target as HTMLInputElement).checked)} /> filter
          </label>
          <button type="button" class="io-btn io-small" onClick={disconnect} disabled={!running}>Client disconnects</button>
        </div>
      </div>
      <pre aria-live="polite">
        {lines.map((l, i) => (
          <div key={i} class={l.tone ? `is-${l.tone}` : undefined}>
            <span class="io-hero-t">{String(l.at).padStart(4, ' ')} ms</span>
            {l.text}
          </div>
        ))}
        {phase === 'timeout' && <div class="is-dim">Pick a 3000 ms timeout and press Run to let the handler finish.</div>}
        <span class="io-hero-caret" aria-hidden="true" />
      </pre>
    </div>
  );
}
