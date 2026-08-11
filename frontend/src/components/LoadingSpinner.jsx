export default function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-14 h-14' }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`${sizes[size]} relative`}>
        <div className={`${sizes[size]} rounded-full border-2 border-brand-500/20`} />
        <div
          className={`${sizes[size]} rounded-full border-t-2 border-brand-500 animate-spin absolute inset-0`}
        />
      </div>
      {text && <p className="text-slate-400 text-sm">{text}</p>}
    </div>
  )
}
