import { defineConfig, searchForWorkspaceRoot } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

const uiKitDir = path.resolve(import.meta.dirname, './node_modules/@sorbent/ui-kit');

// реальный путь кита: через junction Vite отдаёт файлы по цели ссылки
const uiKitRealDir = fs.existsSync(uiKitDir) ? fs.realpathSync(uiKitDir) : uiKitDir;

const normalizeModuleId = (id: string) => id.replaceAll('\\', '/');

// выносит ядро, которое грузится на старте в любом случае; остальное делит сам rolldown
const getVendorChunkName = (id: string) => {
  const normalizedId = normalizeModuleId(id);

  if (!normalizedId.includes('/node_modules/')) {
    return undefined;
  }

  if (normalizedId.includes('/react-router/') || normalizedId.includes('/react-router-dom/')) {
    return 'router-vendor';
  }

  if (
    normalizedId.includes('/react/') ||
    normalizedId.includes('/react-dom/') ||
    normalizedId.includes('/scheduler/')
  ) {
    return 'react-vendor';
  }

  return undefined;
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@sorbent/ui-kit/styles': path.join(uiKitDir, 'src/styles'),
      '@': path.resolve(import.meta.dirname, './src'),
      '@app': path.resolve(import.meta.dirname, './src/app'),
      '@pages': path.resolve(import.meta.dirname, './src/pages'),
      '@shared': path.resolve(import.meta.dirname, './src/shared'),
      '@features': path.resolve(import.meta.dirname, './src/features'),
    },
    dedupe: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
  },
  server: {
    port: 5173,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), uiKitDir, uiKitRealDir],
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks: getVendorChunkName,
      },
    },
  },
});
