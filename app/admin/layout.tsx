import { notFound } from 'next/navigation'
import { requireAdmin } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Return 404 for non-admins - completely hides admin section existence
  const admin = await requireAdmin()
  if (!admin) {
    notFound()
  }

  return (
    <div className="flex min-h-screen bg-darkbg-950">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
