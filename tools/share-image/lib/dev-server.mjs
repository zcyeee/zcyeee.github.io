import { spawn } from 'node:child_process';
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
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });

    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
        if (child.exitCode !== null) throw new Error(`dev server 启动失败：\n${output.trim()}`);
        if (await isUp(url)) {
            log(`已启动 dev server：${url}`);
            return { origin: url, stop: async () => stop(child) };
        }
        await sleep(300);
    }

    stop(child);
    throw new Error(`dev server 启动超时：\n${output.trim()}`);
}
