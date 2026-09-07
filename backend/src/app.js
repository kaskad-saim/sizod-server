import '#configs/env.js';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import deviceDataRoutes from '#features/monitoring/data/routes/deviceDataRoutes.js';
import graphicRoutes from '#features/monitoring/data/routes/graphicRoutes.js';
import monitoringRoutes from '#features/monitoring/diagnostics/routes/monitoringRoutes.js';
import '#features/platform/auth/ssoSetup.js';
import { createSsoAuthRouter } from '@sorbent/platform-kit/sso';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIST = path.join(__dirname, '../../frontend/dist');

// origin'ы, которым разрешено встраивать приложение в iframe
const parseEmbedAllowedOrigins = (raw) =>
  typeof raw === 'string'
    ? raw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
    : [];

const buildFrameAncestorsDirective = (origins) => {
  const unique = [...new Set(origins)];
  return unique.length === 0 ? "frame-ancestors 'none'" : `frame-ancestors 'self' ${unique.join(' ')}`;
};

const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    buildFrameAncestorsDirective(parseEmbedAllowedOrigins(process.env.EMBED_ALLOWED_ORIGINS))
  );
  next();
});

app.use('/api', deviceDataRoutes);
app.use('/api', graphicRoutes);
app.use('/api', monitoringRoutes);
app.use('/api/auth', createSsoAuthRouter());

app.get('/api/server-time', (req, res) => {
  res.json({ time: new Date().toISOString() });
});

app.get('/config.js', (req, res) => {
  res.type('application/javascript');
  res.send(`window.NODE_ENV = "${process.env.NODE_ENV}";`);
});

app.use(express.static(FRONTEND_DIST));

app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
});

export default app;
