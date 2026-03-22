export default function UserNotRegisteredError() {
  return (
    <div className="flex items-center justify-center h-full p-8">
      <div className="text-center space-y-3">
        <div className="text-4xl">⚠️</div>
        <h2 className="text-lg font-semibold text-foreground">Account Not Found</h2>
        <p className="text-muted-foreground text-sm">Please contact your administrator.</p>
      </div>
    </div>
  )
}
