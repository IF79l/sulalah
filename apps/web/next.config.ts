import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: [
    '@sulalah/ui',
    '@sulalah/tree-3d',
    '@sulalah/tree-engine',
    '@sulalah/domain',
    '@sulalah/db',
  ],
};

export default config;
