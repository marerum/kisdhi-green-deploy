/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
  reactStrictMode: false, // 一時的に無効化してテスト
  output: 'standalone', // Azure App Service deployment
}

module.exports = nextConfig