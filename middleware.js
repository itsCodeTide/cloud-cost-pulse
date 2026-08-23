// Clerk authentication is handled client-side by ClerkProvider/useUser.
import { NextResponse } from 'next/server'

// Public routes that never need auth check — serve instantly
export default function middleware() {
  // All routes are public — never redirect, never block
  // Auth state is handled purely client-side via useUser()
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Skip all Next.js internals, static files, and devtools
    '/((?!_next|__next|__clerk|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ico|woff2?|ttf)).*)',
  ],
}
