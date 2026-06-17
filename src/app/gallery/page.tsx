'use client'

import { ImageIcon } from 'lucide-react'
import { useActiveTournamentData } from '@/lib/useTournamentData'
import ConfigError from '@/components/ConfigError'
import { Skeleton } from '@/components/Skeleton'

export default function GalleryPage() {
  const { loading, configured, error, tournament, gallery } = useActiveTournamentData()

  if (!configured) return <ConfigError />

  return (
    <div className="space-y-6 animate-fadeIn">
      <header className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-brand-secondary/10 border border-brand-secondary/20 text-brand-secondary">
          <ImageIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tight">Gallery</h1>
          <p className="text-sm text-dark-muted">{tournament?.name ?? 'Tournament moments'}</p>
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-brand-secondary/30 bg-brand-secondary/5 p-4 text-sm text-brand-secondary">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[9/16] w-full rounded-xl" />
          ))}
        </div>
      ) : !tournament ? (
        <EmptyState message="No active tournament right now." />
      ) : gallery.length === 0 ? (
        <EmptyState message="No images yet. Highlights and screenshots will appear here." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {gallery.map((img) => (
            <a
              key={img.id}
              href={img.image_url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-xl border border-dark-border bg-dark-card transition-all hover:-translate-y-0.5 hover:border-brand-primary/40"
            >
              <div className="aspect-[9/16] w-full overflow-hidden bg-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.image_url}
                  alt={img.title ?? 'Tournament image'}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              {img.title && (
                <p className="truncate px-2.5 py-2 text-xs font-semibold text-white">{img.title}</p>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-dark-border bg-dark-card/40 p-12 text-center">
      <ImageIcon className="mx-auto mb-3 h-8 w-8 text-dark-muted" />
      <p className="text-dark-muted">{message}</p>
    </div>
  )
}
