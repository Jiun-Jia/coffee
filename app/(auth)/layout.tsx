import { Coffee } from 'lucide-react'

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-4">
      <div className="flex items-center gap-2 text-xl font-semibold">
        <Coffee className="size-6" />
        Brewlog
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  )
}
