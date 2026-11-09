/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cricket/shared-types', '@cricket/validation'],
};

export default nextConfig;
