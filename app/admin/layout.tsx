import { notFound } from 'next/navigation'
import { requireModOrAdmin } from '@/lib/auth'
import { AdminSidebar } from '@/components/admin'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Return 404 for non-admins/mods - completely hides admin section existence
  const user = await requireModOrAdmin()
  if (!user) {
    notFound()
  }

  return (
    <div className="flex min-h-screen bg-darkbg-950">
      <AdminSidebar role={user.role} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
