import { readdir, unlink, rmdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

export default async function cleanup() {
  const directory = resolve(process.env.ALFADATA_AUTH_TEST_DIR!);
  if (dirname(directory) !== resolve(tmpdir()) || !basename(directory).startsWith('alfadata-auth-')) {
    throw new Error('Invalid temporary auth fixture directory');
  }
  for (const file of await readdir(directory)) await unlink(join(directory, file));
  await rmdir(directory);
}
