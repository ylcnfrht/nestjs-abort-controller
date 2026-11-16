// Lives outside astro.config so Starlight's <Code> component can load it.
import { defineEcConfig } from '@astrojs/starlight/expressive-code';

export default defineEcConfig({
  themes: ['github-dark-default', 'github-light'],
  styleOverrides: {
    borderRadius: '12px',
    borderColor: 'var(--io-hairline)',
    codeFontFamily: "'Geist Mono Variable', ui-monospace, monospace",
    codeFontSize: '0.84rem',
    codeLineHeight: '1.7',
    codeBackground: 'var(--io-code-bg)',
    uiFontFamily: "'Geist Variable', ui-sans-serif, system-ui, sans-serif",
    frames: {
      shadowColor: 'transparent',
      editorTabBarBackground: 'var(--io-surface)',
      editorActiveTabBackground: 'var(--io-code-bg)',
      editorActiveTabIndicatorTopColor: 'transparent',
      editorActiveTabIndicatorBottomColor: 'var(--sl-color-accent)',
      editorTabBarBorderBottomColor: 'var(--io-hairline)',
      terminalTitlebarBackground: 'var(--io-surface)',
      terminalBackground: 'var(--io-code-bg)',
      frameBoxShadowCssValue: 'none',
    },
  },
});
