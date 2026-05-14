import appIcon from '../../assets/zoomcart-icon.png'

type PageHeaderProps = {
  title: string
  description?: string
}

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-start gap-3">
      <div className="mt-0.5 hidden h-8 w-8 flex-shrink-0 overflow-hidden rounded-xl bg-zinc-900/80 shadow-sm shadow-black/40 sm:block">
        <img src={appIcon} alt="ZoomCart" className="h-full w-full object-contain" />
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-100">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-400">{description}</p>
        ) : null}
      </div>
    </header>
  )
}
