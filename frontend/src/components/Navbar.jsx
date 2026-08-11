import { Bell, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Navbar({ title }) {
  const { user } = useAuth()

  return (
    <header
      className="fixed right-0 top-0 z-40 glass-sm flex items-center justify-between px-6"
      style={{ left: 'var(--sidebar-w)', height: 'var(--topbar-h)' }}
    >
      {/* Title */}
      <h2 className="text-white font-semibold text-lg">{title}</h2>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search…"
            className="input-dark text-sm pl-9 pr-4 py-2 w-48"
          />
        </div>

        {/* Notifications bell */}
        <button className="relative p-2 rounded-xl hover:bg-brand-500/10 transition-colors text-slate-400 hover:text-brand-400">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold cursor-pointer">
          {user?.username?.[0]?.toUpperCase() || 'U'}
        </div>
      </div>
    </header>
  )
}
