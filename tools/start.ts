import { spawn } from 'node:child_process';
import { requireLegacyCulture } from '../src/server/legacy-culture';
requireLegacyCulture(process.env);
const command = process.argv[2];
if (!['dev', 'build', 'start'].includes(command)) throw new Error('Unknown application command');
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', command, ...process.argv.slice(3)], { stdio: 'inherit', env: process.env });
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
