#!/usr/bin/env node
/* eslint-disable no-console */
import { spawn } from 'node:child_process';
import net from 'node:net';

const PORT = Number(process.env.PORT || 3000);

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

  const child = spawn('npx', ['next', 'dev', '-p', String(PORT)], {
    env,
    stdio: 'inherit',
    shell: false,
  });

  const forward = (signal) => () => {
    if (!child.killed) child.kill(signal);
  };

  process.on('SIGINT', forward('SIGINT'));
  process.on('SIGTERM', forward('SIGTERM'));

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[dev-guard] next dev завершився сигналом ${signal}`);
    }
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error('[dev-guard] Неочікувана помилка:', error);
  process.exit(1);
});
