// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import preact from '@astrojs/preact';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';
import starlightLinksValidator from 'starlight-links-validator';

// SKIP_TYPEDOC speeds up content checks; ASTRO_OUT_DIR/CACHE_DIR allow parallel builds.
const skipTypeDoc = process.env.SKIP_TYPEDOC === '1';
const site = 'https://nestjs-abort-controller.ferhatyalcin.dev';
const description =
  'Request cancellation for NestJS: an AbortSignal per request that aborts when the client disconnects or a timeout fires. Express and Fastify.';

export default defineConfig({
  devToolbar: { enabled: false },
  site,
  outDir: process.env.ASTRO_OUT_DIR ?? './dist',
  cacheDir: process.env.ASTRO_CACHE_DIR ?? './node_modules/.astro',
  vite: { server: { fs: { allow: ['..'] } } },
  integrations: [
    preact(),
    starlight({
      title: 'nestjs-abort-controller',
      description,
      logo: { src: './src/assets/logo.svg' },
      favicon: '/favicon.svg',
      customCss: ['@fontsource-variable/geist', '@fontsource-variable/geist-mono', './src/styles/theme.css'],
      components: { Header: './src/components/overrides/Header.astro' },
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/ylcnfrht/nestjs-abort-controller' },
        { icon: 'seti:npm', label: 'npm', href: 'https://www.npmjs.com/package/nestjs-abort-controller' },
      ],
      lastUpdated: false,
      pagination: true,
      tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
      plugins: [
        ...(skipTypeDoc ? [] : [starlightTypeDoc({
          entryPoints: ['../src/index.ts'],
          tsconfig: './typedoc.tsconfig.json',
          output: 'api',
          sidebar: { label: 'API', collapsed: true },
          typeDoc: { excludeInternal: true, excludePrivate: true, readme: 'none', entryFileName: 'overview', excludeExternals: true },
        })]),
        ...(process.env.SKIP_LINKS === '1' ? [] : [starlightLinksValidator({ errorOnLocalLinks: false, exclude: skipTypeDoc ? ['/api/**'] : [] })]),
      ],
      sidebar: [
        { label: 'Start here', items: [{ autogenerate: { directory: 'start' } }] },
        { label: 'Concepts', items: [{ autogenerate: { directory: 'concepts' } }] },
        { label: 'Guides & recipes', items: [{ autogenerate: { directory: 'guides' } }] },
        { label: 'Migrating', collapsed: true, items: [{ autogenerate: { directory: 'migration' } }] },
        { label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
        ...(skipTypeDoc ? [] : [typeDocSidebarGroup]),
      ],
    }),
  ],
});
