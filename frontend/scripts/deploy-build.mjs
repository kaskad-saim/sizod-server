import { spawn } from 'node:child_process';
import { access, rename, rm } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stagingDirName = 'dist-next';
const previousDirName = 'dist-old';
const liveDirName = 'dist';
const stagingDir = resolve(rootDir, stagingDirName);
const previousDir = resolve(rootDir, previousDirName);
const liveDir = resolve(rootDir, liveDirName);

function runProcess(command, args, extraEnv = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: { ...process.env, ...extraEnv },
      stdio: 'inherit',
      windowsHide: true,
      shell: false,
    });

    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`${command} завершился с кодом ${code ?? 'unknown'}`));
      }
    });
  });
}

function runNpm(args) {
  const npmExecPath = process.env.npm_execpath;
  const command = npmExecPath ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const commandArgs = npmExecPath ? [npmExecPath, ...args] : args;

  return runProcess(command, commandArgs);
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function replaceLiveBuild() {
  await rm(previousDir, { recursive: true, force: true });
  const hadLiveBuild = await pathExists(liveDir);

  if (hadLiveBuild) {
    await rename(liveDir, previousDir);
  }

  try {
    await rename(stagingDir, liveDir);
  } catch (error) {
    if (hadLiveBuild && (await pathExists(previousDir))) {
      await rename(previousDir, liveDir);
    }
    throw error;
  }
}

console.log(`[1/3] Подготовка ${stagingDirName}...`);
await rm(stagingDir, { recursive: true, force: true });

console.log(`[2/3] Сборка frontend в ${stagingDirName}...`);
try {
  await runNpm(['run', 'lint']);
  await runNpm(['exec', '--', 'tsc', '-b']);
  await runNpm(['exec', '--', 'vite', 'build', '--outDir', stagingDirName]);
} catch (error) {
  await rm(stagingDir, { recursive: true, force: true });
  throw error;
}

console.log(`[3/3] Замена ${liveDirName}...`);
await replaceLiveBuild();

console.log(`[deploy] Готово. Активная сборка: ${liveDirName}, предыдущая: ${previousDirName}`);
