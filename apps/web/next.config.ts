import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: [
    '@sulalah/ui',
    '@sulalah/tree-svg',
    '@sulalah/tree-engine',
    '@sulalah/domain',
    '@sulalah/billing',
    '@sulalah/messaging',
  ],
};

export default config;
