import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isUp(origin) {
    try {
        const response = await fetch(origin, { signal: AbortSignal.timeout(1500) });
        return response.ok;
    } catch {
        return false;
    }
}

function stop(child) {
    try {
        process.kill(-child.pid, 'SIGTERM'); // detached: kill vite and its children
    } catch {
        child.kill('SIGTERM');
    }
}

/**
 * Ties the server's lifetime to this process. Being detached, the server never
 * sees a Ctrl+C aimed at us, and Node's default signal exit skips `finally`.
 * Returns a function that stops the server and drops the hooks.
 */
function stopOnExit(child) {
    const onExit = () => stop(child);
    const onSignal = (signal) => process.exit(128 + os.constants.signals[signal]);
    process.once('exit', onExit);
    process.once('SIGINT', onSignal);
    process.once('SIGTERM', onSignal);
    return () => {
        process.off('exit', onExit);
        process.off('SIGINT', onSignal);
        process.off('SIGTERM', onSignal);
        stop(child);
    };
}

/**
 * Returns an origin serving the site, starting a Vite dev server when needed.
 * A server we started is ours to stop; an existing one is left running.
 */
export async function ensureSite({ siteDir, port, origin, log = () => {} }) {
    if (origin) {
        if (!(await isUp(origin))) throw new Error(`无法访问 --origin ${origin}`);
        return { origin, stop: async () => {} };
    }

    const url = `http://localhost:${port}`;
    if (await isUp(url)) {
        log(`复用已在 ${url} 运行的 dev server`);
        return { origin: url, stop: async () => {} };
    }

    const vite = path.join(siteDir, 'node_modules/.bin/vite');
    const child = spawn(vite, ['--port', String(port), '--strictPort'], {
        cwd: siteDir,
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    const release = stopOnExit(child);
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });

    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) {
            release();
            throw new Error(`dev server 启动失败：\n${output.trim()}`);
        }
        if (await isUp(url)) {
            log(`已启动 dev server：${url}`);
            return { origin: url, stop: async () => release() };
        }
        await sleep(300);
    }

    release();
    throw new Error(`dev server 启动超时：\n${output.trim()}`);
}
