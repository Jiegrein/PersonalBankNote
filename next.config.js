/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Enable Turbopack explicitly (Next.js 16 default)
  turbopack: {},
  // Configure static generation timeout
  staticPageGenerationTimeout: 120,
  // Disable static optimization for dynamic routes
  reactStrictMode: true,
}

module.exports = nextConfig
