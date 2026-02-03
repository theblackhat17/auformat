import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ToastProvider } from '@/components/ui/Toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Header />
      <main className="pt-16 lg:pt-20 min-h-screen bg-gray-50/50">{children}</main>
      <Footer />
    </ToastProvider>
  );
}
