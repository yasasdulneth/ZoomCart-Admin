export function AccessDenied() {
  return (
    <div className="flex min-h-full items-center justify-center bg-zinc-950 px-4 py-12">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-5 text-center shadow-xl shadow-black/30">
        <p className="text-sm font-semibold text-zinc-100">Access denied</p>
        <p className="mt-2 text-xs text-zinc-400">
          You do not have permission to access this page.
        </p>
      </div>
    </div>
  )
}

