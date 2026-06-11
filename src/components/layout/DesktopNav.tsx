'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = { href: string; label: string };

const linkBase =
  "relative whitespace-nowrap text-sm xl:text-[0.9375rem] font-semibold transition-colors duration-200 pb-1 after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:h-[2px] after:bg-vert-foret after:transition-all after:duration-300 after:ease-out";

function NavLink({ href, label }: NavItem) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`${linkBase} ${active ? 'text-vert-foret after:w-full' : 'text-noir/80 hover:text-vert-foret after:w-0 hover:after:w-full'}`}
    >
      {label}
    </Link>
  );
}

/** Navigation desktop : liens principaux + menu déroulant « Nos ateliers » accessible clavier. */
export function DesktopNav({ links, ateliers }: { links: NavItem[]; ateliers: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLLIElement>(null);
  const pathname = usePathname();
  const atelierActive = ateliers.some((a) => pathname.startsWith(a.href));

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <ul className="hidden lg:flex items-center lg:gap-4 xl:gap-6 2xl:gap-7">
      {links.map((link) => (
        <li key={link.href}>
          <NavLink {...link} />
        </li>
      ))}
      <li
        ref={wrapRef}
        className="relative"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <button
          type="button"
          aria-expanded={open}
          aria-haspopup="true"
          onClick={() => setOpen((o) => !o)}
          className={`${linkBase} inline-flex items-center gap-1.5 cursor-pointer ${
            atelierActive ? 'text-vert-foret after:w-full' : 'text-noir/80 hover:text-vert-foret after:w-0 hover:after:w-full'
          }`}
        >
          Nos ateliers
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-250 ${open ? 'rotate-180' : ''}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
        {open && (
          <ul className="absolute left-1/2 -translate-x-1/2 top-full pt-3 w-56 animate-scale-in origin-top">
            <li className="bg-white rounded-xl shadow-[0_24px_64px_-16px_rgba(43,43,43,0.35)] ring-1 ring-noir/5 overflow-hidden py-2">
              {ateliers.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="block px-5 py-2.5 text-sm font-medium text-noir/80 hover:bg-beige/60 hover:text-vert-foret transition-colors"
                >
                  {a.label}
                </Link>
              ))}
            </li>
          </ul>
        )}
      </li>
    </ul>
  );
}
