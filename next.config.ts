import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    const isDevelopment = process.env.NODE_ENV !== "production";
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=()" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "base-uri 'self'",
          "connect-src 'self' https://generativelanguage.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          "frame-ancestors 'none'",
          "img-src 'self' data: blob:",
          "object-src 'none'",
          `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ""}`,
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "form-action 'self'",
        ].join("; "),
      },
    ];

    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains",
      });
    }

    return [{ source: "/(.*)", headers }];
  },
};

export default nextConfig;
