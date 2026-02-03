'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { getInitials, getDisplayName } from '@/lib/utils';

export function UserDropdown() {
  const { isAuthenticated, profile, isLoading, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isLoading) {
    return <div className="w-9 h-9 rounded-full bg-gray-200 animate-pulse" />;
  }

  if (!isAuthenticated || !profile) {
    return (
      <div className="hidden lg:flex items-center gap-3">
        <Link
          href="/login"
          className="text-sm font-medium text-noir/70 hover:text-vert-foret transition-colors"
        >
          Connexion
        </Link>
        <Link
          href="/register"
          className="text-sm font-medium bg-vert-foret text-white px-4 py-2 rounded-lg hover:bg-vert-foret-dark transition-colors"
        >
          Inscription
        </Link>
      </div>
    );
  }

  const initials = getInitials(profile.fullName);
  const displayName = getDisplayName(profile);

  return (
    <div className="relative hidden lg:block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1 rounded-lg hover:bg-beige/50 transition-colors"
      >
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-vert-foret text-white flex items-center justify-center text-sm font-semibold">
            {initials}
          </div>
        )}
        <span className="text-sm font-medium text-noir/80 max-w-[120px] truncate">{displayName}</span>
        <svg className={`w-4 h-4 text-noir/50 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-100 py-2 animate-slide-down">
          {/* User info */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-noir">{displayName}</p>
            <p className="text-xs text-noir/50 truncate">{profile.email}</p>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link href="/profil" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-noir/70 hover:bg-beige/50 hover:text-noir transition-colors">
              <span className="w-5 text-center">👤</span> Mon profil
            </Link>
            <Link href="/mes-projets" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-noir/70 hover:bg-beige/50 hover:text-noir transition-colors">
              <span className="w-5 text-center">📁</span> Mes projets
            </Link>
            <Link href="/mes-devis" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-noir/70 hover:bg-beige/50 hover:text-noir transition-colors">
              <span className="w-5 text-center">📄</span> Mes devis
            </Link>
            {profile.role === 'admin' && (
              <Link href="/admin" onClick={() => setIsOpen(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm text-vert-foret font-medium hover:bg-beige/50 transition-colors">
                <span className="w-5 text-center">⚙️</span> Administration
              </Link>
            )}
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 pt-1">
            <button
              onClick={() => { setIsOpen(false); logout(); }}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left transition-colors"
            >
              <span className="w-5 text-center">🚪</span> Se deconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
