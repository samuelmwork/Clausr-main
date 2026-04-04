/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          {
            // Allow sensor APIs that Razorpay's fraud detection (Sardine) needs.
            // Without this, the browser logs Permissions Policy violations in the console.
            key: 'Permissions-Policy',
            value: 'accelerometer=*, gyroscope=*, magnetometer=*, payment=*, camera=(), microphone=()',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
