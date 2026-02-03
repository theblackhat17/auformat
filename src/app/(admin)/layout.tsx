import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { ToastProvider } from '@/components/ui/Toast';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    redirect('/login');
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-gray-50">
        <AdminSidebar />
        <main className="flex-1 ml-64 p-6 lg:p-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
