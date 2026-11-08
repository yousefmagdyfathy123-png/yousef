import { appendFileSync } from 'node:fs';
const path = process.env.ALFADATA_PERF_MEMORY_FILE;
if (path) {
  const sample = () => {
    const { rss, heapUsed } = process.memoryUsage();
    appendFileSync(path, JSON.stringify({ pid: process.pid, atMs: Date.now(), rss, heapUsed }) + '\n');
  };
  sample();
  setInterval(sample, 1000).unref();
}
