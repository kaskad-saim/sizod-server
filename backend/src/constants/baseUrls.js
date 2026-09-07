const isDev = process.env.NODE_ENV === 'development';

export const NODES = Object.freeze({
  MAIN: { host: '169.254.0.213', port: 3002 },
  SERVER: { host: '169.254.0.0', port: 3002 },
});

function buildBaseUrl(host, port) {
  return `http://${host}:${port}`;
}

export const MAIN_API_BASE_URL = isDev ? 'http://localhost:3002' : buildBaseUrl(NODES.MAIN.host, NODES.MAIN.port);
export const SERVER_BASE_URL = isDev ? 'http://localhost:3002' : buildBaseUrl(NODES.SERVER.host, NODES.SERVER.port);
