import type { NextConfig } from "next";

// 'unsafe-eval' n'est requis que par le HMR de développement — jamais en production
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(process.env.NODE_ENV === "development" ? ["'unsafe-eval'"] : []),
  "blob:",
  "https://accounts.google.com",
  "https://apis.google.com",
  "https://www.auformat.com",
].join(" ");

const nextConfig: NextConfig = {
  output: "standalone",
  // pdfkit embarque ses fichiers de polices (.afm) : il doit rester un require runtime
  serverExternalPackages: ["pdfkit"],
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/homemade",
        destination: "/savoir-faire",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/umami",
        destination: "http://localhost:3001/",
      },
      {
        source: "/umami/:path*",
        destination: "http://localhost:3001/:path*",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src ${scriptSrc}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://res.cloudinary.com https://*.googleusercontent.com",
              "connect-src 'self' https://accounts.google.com https://apis.google.com https://www.auformat.com",
              "frame-src https://accounts.google.com https://www.google.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
