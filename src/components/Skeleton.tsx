import React from 'react'

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-800/60 ${className}`}
      {...props}
    />
  )
}

export function MatchCardSkeleton() {
  return (
    <div className="rounded-xl border border-dark-border bg-dark-card/50 p-4 space-y-4">
      <div className="flex justify-between items-center">
        <Skeleton className="h-3.5 w-16" />
        <Skeleton className="h-3.5 w-12" />
      </div>
      <div className="flex justify-between items-center gap-4 py-2">
        <div className="flex items-center gap-2 flex-1">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-6 w-12 rounded-lg" />
        <div className="flex items-center gap-2 flex-1 justify-end">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
        </div>
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-dark-border/40">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-12" />
      </div>
    </div>
  )
}

export function BracketRoundSkeleton() {
  return (
    <div className="flex flex-col gap-3 w-full lg:w-[220px] shrink-0">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-border bg-dark-card/50">
        <Skeleton className="h-5 w-5 rounded shrink-0" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-2.5 w-12" />
        </div>
      </div>
      <div className="flex flex-col gap-3 justify-around flex-1">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-dark-border bg-dark-card/50 p-3 space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-dark-border/20">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-8" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded shrink-0" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <Skeleton className="h-4 w-6" />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-6 rounded shrink-0" />
                  <Skeleton className="h-3.5 w-16" />
                </div>
                <Skeleton className="h-4 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function StandingsRowSkeleton() {
  return (
    <tr className="border-b border-dark-border/40 animate-pulse">
      <td className="py-4 px-4 text-center">
        <Skeleton className="h-7 w-7 rounded-full mx-auto" />
      </td>
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-12 md:hidden" />
          </div>
        </div>
      </td>
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="py-4 px-3 text-center">
          <Skeleton className="h-4 w-6 mx-auto" />
        </td>
      ))}
      <td className="py-4 px-4 text-center">
        <Skeleton className="h-8 w-10 rounded-lg mx-auto" />
      </td>
    </tr>
  )
}
