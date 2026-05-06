/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { dev }) => {
    if (dev) {
      // Disable persistent disk-caching in development to prevent ENOENT corrupt files on Windows paths
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
