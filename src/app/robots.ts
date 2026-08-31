import type { MetadataRoute } from 'next'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Everything behind auth is members-only; crawlers get the pitch pages.
      disallow: ['/discover', '/sessions', '/wallet', '/profile', '/leaderboard', '/u/', '/onboarding', '/auth/'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
