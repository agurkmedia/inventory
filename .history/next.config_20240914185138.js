module.exports = {
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // ... other Next.js config options
};