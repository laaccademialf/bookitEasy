const nextConfig = {
  reactStrictMode: true,
  onDemandEntries: {
    // Keep compiled dev pages much longer to reduce chunk 404 during navigation.
    maxInactiveAge: 1000 * 60 * 60,
    pagesBufferLength: 100,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // In Codespaces/github.dev, filesystem cache can get out of sync and cause missing chunk/module errors.
      config.cache = false;
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
        ignored: ['**/.git/**', '**/node_modules/**'],
      };
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    if (process.env.NODE_ENV !== 'development') {
      return [];
    }

    return [
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
          {
            key: 'Surrogate-Control',
            value: 'no-store',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
