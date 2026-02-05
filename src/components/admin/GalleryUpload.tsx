'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface GalleryUploadProps {
  value: { image: string }[];
  onChange: (gallery: { image: string }[]) => void;
  label?: string;
}

export function GalleryUpload({ value, onChange, label = 'Galerie photos' }: GalleryUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(async (files: FileList) => {
    setError('');
    setUploading(true);

    try {
      const newImages: { image: string }[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/admin/upload', { method: 'POST', body: formData });
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Erreur upload');
          continue;
        }

        newImages.push({ image: data.path });
      }

      onChange([...value, ...newImages]);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setUploading(false);
    }
  }, [value, onChange]);

  const removeImage = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleUpload(e.target.files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((item, i) => (
            <div key={i} className="relative">
              <Image src={item.image} alt={`Gallery ${i + 1}`} width={80} height={80} className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors border-gray-300 hover:border-gray-400 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleFileChange} />
        {uploading ? (
          <p className="text-sm text-gray-500">Upload en cours...</p>
        ) : (
          <p className="text-sm text-gray-500">Ajouter des photos (JPEG, PNG, WebP)</p>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
