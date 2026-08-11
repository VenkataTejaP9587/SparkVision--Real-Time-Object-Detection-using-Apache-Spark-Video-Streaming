import { TrendingUp, TrendingDown } from 'lucide-react'

export default function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
  trendUp = true,
  gradient = 'from-brand-500 to-purple-600',
  loading = false,
}) {
  return (
    <div className="glass p-5 hover:border-brand-500/30 transition-all duration-300 hover:-translate-y-0.5 hover:glow-brand group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
          {Icon && <Icon className="w-5 h-5 text-white" />}
        </div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-medium ${trendUp ? 'text-emerald-400' : 'text-red-400'}`}>
            {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton h-7 w-24 rounded" />
          <div className="skeleton h-4 w-32 rounded" />
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-white count-animate">{value ?? '—'}</p>
          <p className="text-xs text-slate-400 mt-1">{title}</p>
          {sub && <p className="text-[11px] text-slate-600 mt-0.5">{sub}</p>}
        </>
      )}
    </div>
  )
}
