/** @type {import('next').NextConfig} */
const backendTarget = process.env.INTERNAL_API_TARGET || "http://localhost:4000";

const nextConfig = {
  experimental: {
    typedRoutes: true,
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${backendTarget}/api/:path*` },
      { source: "/health", destination: `${backendTarget}/health` },
    ];
  },
};

export default nextConfig;
