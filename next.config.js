/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Load @vercel/og as a real Node.js module (not bundled by webpack).
  // Prevents webpack from mangling import.meta.url on Windows, which breaks
  // the font/wasm loading in @vercel/og/dist/index.node.js at startup.
  experimental: {
    // Load @vercel/og as a real Node.js module (not bundled by webpack).
    // Prevents webpack from mangling import.meta.url on Windows, which breaks
    // the font/wasm loading in @vercel/og/dist/index.node.js at startup.
    serverComponentsExternalPackages: ["@vercel/og"],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;


