// llms.txt (https://llmstxt.org): an index of every docs page so coding agents can find the right one.
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const sections = ['start', 'concepts', 'guides', 'migration', 'reference'];

export const GET: APIRoute = async ({ site }) => {
  const docs = await getCollection('docs');
  const body = sections
    .map((s) => {
      const items = docs
        .filter((d) => d.id.startsWith(`${s}/`) && !d.data.sidebar?.hidden)
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((d) => `- [${d.data.title}](${new URL(`/${d.id}/`, site)})${d.data.description ? `: ${d.data.description}` : ''}`);
      return `## ${s[0]!.toUpperCase()}${s.slice(1)}\n\n${items.join('\n')}`;
    })
    .join('\n\n');
  const head = `# nestjs-abort-controller\n\n> Request cancellation for NestJS 11 (Express and Fastify): AbortControllerModule registers a middleware that creates one AbortController per request and aborts its signal when the client disconnects before the response finishes, or when the timeout (default 30000 ms, 0 disables) fires. Inject the signal with @NestAbortSignal() and pass it to fetch, drivers and loops.\n\nKey rules: the injected value IS a native AbortSignal; the abort reason is an AbortError whose \`reason\` is 'timeout' or 'client-disconnected'; throwIfAborted(signal) rethrows that same error; without AbortExceptionFilter an AbortError becomes a 500, with it a timeout becomes 408 and a disconnect sends nothing; outside controllers read req[ABORT_SIGNAL] (Fastify: req.raw[ABORT_SIGNAL]); the timeout only aborts the signal, it does not end the response by itself.\n\nAPI reference: ${new URL('/api/overview/', site)}\n\n`;
  return new Response(head + body + '\n', { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
