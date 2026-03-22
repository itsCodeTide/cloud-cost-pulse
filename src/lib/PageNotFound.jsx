import { Link } from 'react-router-dom'
export default function PageNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-background">
      <div className="text-6xl font-bold text-gradient">404</div>
      <p className="text-muted-foreground text-lg">Page not found</p>
      <Link to="/" className="text-primary hover:underline text-sm">← Go to Dashboard</Link>
    </div>
  )
}
