import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for Electron app
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Use relative paths for static export
  basePath: '',
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : '',
  
  // Ensure compatibility with Electron
  trailingSlash: true,
};

export default nextConfig;
