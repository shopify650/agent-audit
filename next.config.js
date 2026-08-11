/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  outputFileTracingIncludes: {
    '/api/audit': ['./node_modules/@sparticuz/chromium/bin/**/*'],
  },
};

module.exports = nextConfig;
