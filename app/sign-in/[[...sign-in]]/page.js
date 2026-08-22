'use client'

import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <SignIn appearance={{ variables: { colorPrimary: '#8b5cf6' } }} />
    </div>
  )
}
