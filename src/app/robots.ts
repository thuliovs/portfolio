import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const isPublic = process.env.PORTFOLIO_PUBLIC === "true";

  return {
    rules: {
      userAgent: "*",
      ...(isPublic ? { allow: "/" } : { disallow: "/" }),
    },
  };
}
