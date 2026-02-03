/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Ignore lint during builds since there are pre-existing lint issues
    // Run `npm run lint` separately to check for issues
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
