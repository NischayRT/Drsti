/** @type {import('next').NextConfig} */
const nextConfig = {
  output:        'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // No assetPrefix — handled via Electron protocol interceptor
}

export default nextConfig
