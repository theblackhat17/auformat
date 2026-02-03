'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ADMIN_NAV_CRM, ADMIN_NAV_CONTENT } from '@/lib/constants';
import { getInitials, getDisplayName } from '@/lib/utils';

function NavItem({ item, pathname }: { item: { href: string; label: string; icon: string }; pathname: string }) {
  const isActive = item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
        isActive
          ? 'bg-white/10 text-white border-l-3 border-blue-400 font-medium'
          : 'text-white/60 hover:bg-white/5 hover:text-white border-l-3 border-transparent'
      }`}
    >
      <span className="text-base">{item.icon}</span>
      {item.label}
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { profile, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 w-64 h-screen bg-gradient-to-b from-slate-800 to-slate-900 text-white flex flex-col z-40">
      {/* Logo area */}
      <div className="p-6 border-b border-white/10">
        <Link href="/" className="text-lg font-bold tracking-wider text-white">
          Au Format
        </Link>
        <p className="text-xs text-white/40 mt-1">Administration</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <p className="px-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">CRM</p>
        {ADMIN_NAV_CRM.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
        ))}

        <div className="my-3 mx-6 border-t border-white/10" />

        <p className="px-6 pb-2 text-[10px] font-semibold uppercase tracking-wider text-white/30">Contenu</p>
        {ADMIN_NAV_CONTENT.map((item) => (
          <NavItem key={item.href} item={item} pathname={pathname} />
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
  );
}
