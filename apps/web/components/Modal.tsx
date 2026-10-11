'use client';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({ titre, onClose, children }: { titre: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={titre}>
      <button className="absolute inset-0 bg-fonce/50" aria-label="Fermer" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{titre}</h2>
          <button className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-fond" aria-label="Fermer" onClick={onClose}><X className="h-5 w-5" aria-hidden /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
