import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.ELECTRON_BUILD ? undefined : 'standalone',
  webpack: (config, { isServer }) => {
    // Configuración para better-sqlite3
    if (isServer) {
      config.externals.push('better-sqlite3');
    }
    return config;
  },
};

export default nextConfig;
