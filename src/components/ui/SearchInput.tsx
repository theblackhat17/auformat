'use client';

import { useState, useEffect, useRef } from 'react';
import { debounce } from '@/lib/utils';

interface SearchInputProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  delay?: number;
}

export function SearchInput({ placeholder = 'Rechercher...', onSearch, delay = 300 }: SearchInputProps) {
  const [value, setValue] = useState('');
  const debouncedRef = useRef(debounce(onSearch, delay));

  useEffect(() => {
    debouncedRef.current = debounce(onSearch, delay);
  }, [onSearch, delay]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);
    debouncedRef.current(v);
  }

  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-noir/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-noir placeholder-noir/30 focus:outline-none focus:border-vert-foret focus:ring-2 focus:ring-vert-foret/10"
      />
    </div>
  );
}
