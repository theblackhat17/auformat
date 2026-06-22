'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_NAV_CRM, ADMIN_NAV_CONTENT } from '@/lib/constants';
import { getInitials, getDisplayName } from '@/lib/utils';
import { useChatUnread } from '@/lib/useChatUnread';

function NavItem({ item, pathname, onClick, badge }: { item: { href: string; label: string; icon: string }; pathname: string; onClick?: () => void; badge?: number }) {
  const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 mx-3 px-3 py-2.5 text-sm rounded-lg transition-colors ${
        isActive
          ? 'bg-vert-foret text-white font-semibold'
          : 'text-white/65 hover:bg-white/8 hover:text-white'
      }`}
    >
      <span className="text-base">{item.icon}</span>
      <span className="flex-1">{item.label}</span>
      {badge ? (
        <span className="min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center">{badge}</span>
      ) : null}
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const { total: chatUnread } = useChatUnread();

  // Close sidebar on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const closeSidebar = () => setOpen(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden flex items-center justify-center w-10 h-10 rounded-lg bg-noir text-white shadow-lg"
        aria-label="Ouvrir le menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Backdrop (mobile only) */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 w-64 h-screen bg-noir text-white flex flex-col z-50 transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Close button (mobile) */}
        <button
          onClick={closeSidebar}
          className="absolute top-3 right-3 lg:hidden w-8 h-8 flex items-center justify-center text-white/60 hover:text-white rounded"
          aria-label="Fermer le menu"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo area */}
        <div className="p-6 border-b border-white/10">
          <Link href="/" className="font-display text-xl text-white">
            Au Format
          </Link>
          <p className="text-xs text-bois-clair/80 mt-1">L&apos;établi — administration</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <p className="px-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">CRM</p>
          {ADMIN_NAV_CRM.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} onClick={closeSidebar} badge={item.href === '/admin/chat' ? chatUnread : undefined} />
          ))}

          <div className="my-3 mx-6 border-t border-white/10" />

          <p className="px-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Contenu</p>
          {ADMIN_NAV_CONTENT.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} onClick={closeSidebar} />
          ))}
        </nav>

        {/* User section */}
        {profile && (
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-vert-foret text-white flex items-center justify-center text-xs font-semibold">
                {getInitials(profile.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{getDisplayName(profile)}</p>
                <p className="text-xs text-white/40 truncate">{profile.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/"
                className="flex-1 text-center text-xs py-1.5 text-white/60 hover:text-white border border-white/20 rounded hover:bg-white/10 transition-colors"
              >
                Voir le site
              </Link>
              <button
                onClick={logout}
                className="flex-1 text-center text-xs py-1.5 text-red-400 hover:text-red-300 border border-red-400/30 rounded hover:bg-red-400/10 transition-colors"
              >
                Deconnexion
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
