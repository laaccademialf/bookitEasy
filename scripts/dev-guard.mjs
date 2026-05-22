#!/usr/bin/env node
/* eslint-disable no-console */
import { spawn } from 'node:child_process';
import { rm } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = Number(process.env.PORT || 3000);
const MAX_RECOVERY_ATTEMPTS = 1;
const RECOVERY_PATTERNS = [
  /Cannot find module '\.\/\d+\.js'/i,
  /webpack-runtime\.js/i,
  /ChunkLoadError/i,
  /loading chunk/i,
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const NEXT_DIR = path.join(ROOT_DIR, '.next');

function checkPortInUse(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', (err) => {
        if (err && err.code === 'EADDRINUSE') {
          resolve(true);
        } else {
          resolve(false);
        }
      })
      .once('listening', () => {
        tester.close(() => resolve(false));
      })
      .listen(port, '0.0.0.0');
  });
}

async function sanitizeBuildArtifacts() {
  console.log('[dev-guard] Очищаю .next для консистентного dev-старту...');
  await rm(NEXT_DIR, { force: true, recursive: true });
}

function shouldRecoverFromOutput(text) {
  return RECOVERY_PATTERNS.some((pattern) => pattern.test(text));
}

function runNextDev(env) {
  return new Promise((resolve) => {
    const child = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
      env,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
    });

    let collected = '';

    const onData = (stream, chunk) => {
      const text = chunk.toString();
      collected += text;
      stream.write(text);
    };

    child.stdout.on('data', (chunk) => onData(process.stdout, chunk));
    child.stderr.on('data', (chunk) => onData(process.stderr, chunk));

    const forward = (signal) => () => {
      if (!child.killed) child.kill(signal);
    };

    process.on('SIGINT', forward('SIGINT'));
    process.on('SIGTERM', forward('SIGTERM'));

    child.on('exit', (code, signal) => {
      resolve({ code: code ?? 0, signal, output: collected });
    });
  });
}

async function main() {
  const inUse = await checkPortInUse(PORT);
  if (inUse) {
    console.error('\n[dev-guard] Порт ' + PORT + ' уже зайнятий.');
    console.error('[dev-guard] Скоріш за все, dev-сервер уже запущено в іншому терміналі.');
    console.error('[dev-guard] Відкрийте його та продовжуйте роботу — НЕ запускайте npm run dev двічі.');
    console.error('[dev-guard] Якщо ж процес залип, виконайте: npm run dev:clean\n');
    process.exit(1);
  }

  const env = {
    ...process.env,
    WATCHPACK_POLLING: 'true',
    CHOKIDAR_USEPOLLING: '1',
  };

  await sanitizeBuildArtifacts();

  let attempt = 0;
  while (attempt <= MAX_RECOVERY_ATTEMPTS) {
    const result = await runNextDev(env);

    if (result.signal) {
      console.log(`[dev-guard] next dev завершився сигналом ${result.signal}`);
      process.exit(result.code);
    }

    if (result.code === 0) {
      process.exit(0);
    }

    const canRecover = shouldRecoverFromOutput(result.output) && attempt < MAX_RECOVERY_ATTEMPTS;
    if (!canRecover) {
      process.exit(result.code);
    }

    attempt += 1;
    console.error('[dev-guard] Виявлено зламаний chunk/runtime. Виконую auto-heal і перезапуск...');
    await sanitizeBuildArtifacts();
  }
}

main().catch((error) => {
  console.error('[dev-guard] Неочікувана помилка:', error);
  process.exit(1);
});
