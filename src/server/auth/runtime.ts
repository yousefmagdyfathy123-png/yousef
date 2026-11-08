import 'server-only';
import { after } from 'next/server';
import { db } from '../db/pool';
import { createSmtpMailTransport } from '../mail/smtp';
import { createIdentity } from './config';
import { trustedEdgeCountryResolver } from '../commerce/country';

const origin = process.env.BETTER_AUTH_URL;
const secret = process.env.BETTER_AUTH_SECRET;
if (!origin || !secret) throw new Error('BETTER_AUTH_URL and BETTER_AUTH_SECRET are required');

export const identity = createIdentity({
  database: db, origin, secret,
  resolveCountry: trustedEdgeCountryResolver(process.env.ALFADATA_GEO_EDGE_TOKEN),
  schedule: task => after(async () => { await task; }),
  mail: {
    async send(message) {
      try {
        await createSmtpMailTransport().send(message);
      } catch (error) {
        console.error('Account email delivery failed.');
        throw error;
      }
    },
  },
});
export const { auth } = identity;
