import './globals.css'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Cloud-Cost-Pulse — Azure Cost Analytics',
  description: 'Smart Azure Cloud Cost Monitoring & Analytics Dashboard',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={inter.className}>
        <ClerkProvider
          appearance={{
            unoptimized: false, variables: { colorPrimary: '#8b5cf6', colorBackground: '#0a0a0a', colorText: '#fafafa' },
          }}
        >
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
            {children}
            <Toaster richColors position="top-right" />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}

export const config = {
  output: 'standalone',
};
