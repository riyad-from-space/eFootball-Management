import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    // Team logos can be hosted anywhere (e.g. Supabase Storage). Allow https.
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
}

export default nextConfig
