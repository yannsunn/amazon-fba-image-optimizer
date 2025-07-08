/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ['amazon-fba-images.s3.amazonaws.com'],
  },
  env: {
    BACKEND_URL: process.env.BACKEND_URL,
    NEXT_PUBLIC_S3_BUCKET: process.env.NEXT_PUBLIC_S3_BUCKET,
  },
}

module.exports = nextConfig