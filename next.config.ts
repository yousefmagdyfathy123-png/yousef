import type { NextConfig } from 'next';
const config: NextConfig = {
  poweredByHeader: false,
  logging: { incomingRequests: false },
  serverExternalPackages: ['better-auth'],
};
export default config;
