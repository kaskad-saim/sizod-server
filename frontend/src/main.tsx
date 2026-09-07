import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@app/styles/global.scss';
import App from '@app/App.tsx';
import { getEmbedAllowedOrigins } from '@features/platform/sso-auth';
import { AppThemeProvider } from '@shared/theme';
import { EmbedReadyProvider } from '@sorbent/ui-kit/theme';

const EMBED_ALLOWED_ORIGINS: readonly string[] = getEmbedAllowedOrigins();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppThemeProvider embedAllowedOrigins={EMBED_ALLOWED_ORIGINS}>
      <EmbedReadyProvider>
        <App />
      </EmbedReadyProvider>
    </AppThemeProvider>
  </StrictMode>
);
