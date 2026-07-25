import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/panel",
          "/perfil",
          "/solicitudes/",
          "/trabajos",
          "/pagos",
          "/admin/",
          "/intranet/",
          "/auth/",
          "/registro/biometria",
          "/experiencia",
          "/verificacion",
          "/credencial",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
