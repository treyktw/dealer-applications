import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true
  },
  /* config options here */
  images: {
    // domains: ["treyktw-dealer.s3.us-east-2.amazonaws.com"],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'dealership-*.s3.us-east-2.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.us-east-2.amazonaws.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      // Add other image domains you might be using
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
