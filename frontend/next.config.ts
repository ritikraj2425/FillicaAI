import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for Electron app
  output: 'export',
  
  // Disable image optimization for static export
  images: {
    unoptimized: true,
  },
  
  // Use relative paths for static export (needed for local HTTP server)
  basePath: '',
  
  // Ensure compatibility with Electron
  trailingSlash: true,
};

export default nextConfig;
