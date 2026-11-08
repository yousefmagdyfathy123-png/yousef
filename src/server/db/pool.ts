import { Pool } from 'pg';
import { databaseUrl } from './url';

export const db = new Pool({ connectionString: databaseUrl() });
