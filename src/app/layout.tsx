import type { Metadata, Viewport } from 'next'
import { Bricolage_Grotesque, Geist } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const body = Geist({
  variable: '--font-body',
  subsets: ['latin'],
})

const display = Bricolage_Grotesque({
  variable: '--font-display-var',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'SkillSwap — learn from your campus',
    template: '%s · SkillSwap',
  },
  description:
    'Learn any skill from a student on your campus. Teach an hour, earn a credit, spend it learning something new. No money — just time.',
}

export const viewport: Viewport = {
  themeColor: '#faf7f2',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable}`}>
      <body className="min-h-dvh antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
