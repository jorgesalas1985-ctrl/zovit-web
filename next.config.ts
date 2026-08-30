import type { NextConfig } from "next";
import { getSecurityHeaders } from "./lib/security/headers";

const securityHeaderList = Object.entries(getSecurityHeaders()).map(([key, value]) => ({
  key,
  value,
}));

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async redirects() {
    return [
      {
        source: "/admin/pagos",
        destination: "/intranet/finanzas/pagos",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/sitemap.xml", destination: "/sitemap/sitemap.xml" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaderList,
      },
      {
        source: "/intranet/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          { key: "Expires", value: "0" },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Content-Type", value: "application/xml; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/sitemap/sitemap.xml",
        headers: [
          { key: "Content-Type", value: "application/xml; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
