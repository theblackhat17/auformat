import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { AdminSearch } from '@/components/admin/AdminSearch';
import { AdminFocusScroll } from '@/components/admin/AdminFocusScroll';
import { ToastProvider } from '@/components/ui/Toast';
import { AuthProvider } from '@/contexts/AuthContext';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <AuthProvider>
      <ToastProvider>
        <div className="flex min-h-screen bg-gray-50">
          <AdminSidebar />
          <main className="flex-1 min-w-0 lg:ml-64 overflow-x-hidden">
            {/* Barre de recherche large, collée en haut du contenu */}
            <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 px-4 lg:px-8 py-3 pl-16 lg:pl-8">
              <AdminSearch />
            </div>
            <Suspense fallback={null}><AdminFocusScroll /></Suspense>
            <div className="p-4 lg:p-8 max-w-full">{children}</div>
          </main>
        </div>
      </ToastProvider>
    </AuthProvider>
  );
}
