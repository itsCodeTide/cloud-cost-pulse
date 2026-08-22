'use client'

import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <SignUp appearance={{ variables: { colorPrimary: '#8b5cf6' } }} />
    </div>
  )
}
