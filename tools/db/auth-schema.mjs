import { betterAuth } from 'better-auth';
import { db } from '../../src/server/db/pool.ts';

export const auth = betterAuth({ database: db, emailAndPassword: { enabled: true } });
