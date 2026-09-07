import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const isWindows = process.platform === 'win32';
const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const services = [
  { name: 'backend', cwd: resolve(rootDir, 'backend') },
  { name: 'frontend', cwd: resolve(rootDir, 'frontend') },
];

function spawnNpm(args, options) {
  if (isWindows) {
    return spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `npm.cmd ${args.join(' ')}`], options);
  }

  return spawn('npm', args, options);
}

async function checkConfiguration() {
  for (const service of services) {
    if (!existsSync(resolve(service.cwd, 'package.json'))) {
      throw new Error(`Не найден package.json для ${service.name}: ${service.cwd}`);
    }

    await new Promise((done, reject) => {
      const child = spawnNpm(['--version'], {
        cwd: service.cwd,
        stdio: 'ignore',
        windowsHide: true,
      });
      child.once('error', reject);
      child.once('exit', (code) => {
        if (code === 0) {
          done();
          return;
        }
        reject(new Error(`npm недоступен для ${service.name}, код ${code ?? 1}`));
      });
    });
  }

  console.log('Dev runner: конфигурация корректна');
}

if (process.argv.includes('--check')) {
  await checkConfiguration();
  process.exit(0);
}

const children = new Map();
let isShuttingDown = false;

function forwardOutput(stream, target, serviceName) {
  if (!stream) {
    return;
  }

  const colors = {
    backend: '\u001b[34m',
    frontend: '\u001b[35m',
  };
  const reset = '\u001b[0m';
  const prefix = process.stdout.isTTY ? `${colors[serviceName] ?? ''}[${serviceName}]${reset}` : `[${serviceName}]`;
  let buffered = '';

  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    buffered += chunk;
    const lines = buffered.split(/\r\n|\n|\r/);
    buffered = lines.pop() ?? '';

    for (const line of lines) {
      target.write(`${prefix} ${line}\n`);
    }
  });
  stream.on('end', () => {
    if (buffered) {
      target.write(`${prefix} ${buffered}\n`);
      buffered = '';
    }
  });
}

function stopProcessTree(child) {
  if (!child.pid || child.exitCode !== null) {
    return Promise.resolve();
  }

  if (isWindows) {
    return new Promise((done) => {
      const killer = spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      killer.once('error', done);
      killer.once('exit', done);
    });
  }

  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }

  return Promise.resolve();
}

async function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  await Promise.all(Array.from(children.values(), stopProcessTree));
  process.exit(exitCode);
}

function startService(service) {
  console.log(`[dev] Запуск ${service.name}`);

  const child = spawnNpm(['run', 'dev'], {
    cwd: service.cwd,
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
    detached: !isWindows,
    windowsHide: true,
  });

  children.set(service.name, child);
  forwardOutput(child.stdout, process.stdout, service.name);
  forwardOutput(child.stderr, process.stderr, service.name);

  child.once('error', (error) => {
    console.error(`[dev] Не удалось запустить ${service.name}: ${error.message}`);
    void shutdown(1);
  });

  child.once('exit', (code, signal) => {
    children.delete(service.name);
    if (isShuttingDown) {
      return;
    }

    const reason = signal ? `сигнал ${signal}` : `код ${code ?? 1}`;
    console.error(`[dev] ${service.name} завершился (${reason}), останавливаю второй процесс`);
    void shutdown(code ?? 1);
  });
}

process.once('SIGINT', () => {
  void shutdown(0);
});
process.once('SIGTERM', () => {
  void shutdown(0);
});

services.forEach(startService);

const autoStopMs = Number(process.env.DEV_RUNNER_AUTO_STOP_MS);
if (Number.isFinite(autoStopMs) && autoStopMs > 0) {
  setTimeout(() => {
    void shutdown(0);
  }, autoStopMs);
}
