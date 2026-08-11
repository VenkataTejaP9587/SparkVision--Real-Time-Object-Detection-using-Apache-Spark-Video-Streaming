import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Camera, Upload, BarChart3, History,
  FileText, User, Settings, Zap, Activity, LogOut, ChevronRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/live',      icon: Camera,          label: 'Live Detection' },
  { to: '/upload',    icon: Upload,          label: 'Video Upload' },
  { to: '/analytics', icon: BarChart3,       label: 'Analytics' },
  { to: '/history',   icon: History,         label: 'History' },
  { to: '/reports',   icon: FileText,        label: 'Reports' },
]

const bottomItems = [
  { to: '/profile',  icon: User,     label: 'Profile' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const { connected } = useSocket()

  return (
    <aside
      className="fixed left-0 top-0 h-screen glass flex flex-col z-50 transition-all duration-300"
      style={{ width: 'var(--sidebar-w)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-brand-500/10">
        <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg glow-brand">
          <Zap className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-sm leading-tight">SparkVision</h1>
          <p className="text-slate-500 text-[10px]">Real-Time Detection</p>
        </div>
      </div>

      {/* Socket status */}
      <div className="flex items-center gap-2 px-5 py-2">
        <Activity className="w-3 h-3 text-slate-500" />
        <span className={`text-[10px] font-medium ${connected ? 'text-emerald-400' : 'text-slate-500'}`}>
          {connected ? 'Stream Connected' : 'Disconnected'}
        </span>
        <span className={`ml-auto w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <p className="text-[10px] text-slate-600 uppercase tracking-widest px-2 pt-2 pb-1">Main</p>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            <ChevronRight className="w-3 h-3 ml-auto opacity-30" />
          </NavLink>
        ))}

        <p className="text-[10px] text-slate-600 uppercase tracking-widest px-2 pt-4 pb-1">Account</p>
        {bottomItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            <span>{label}</span>
            <ChevronRight className="w-3 h-3 ml-auto opacity-30" />
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-brand-500/10">
        <div className="glass-sm flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-brand flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.username}</p>
            <p className="text-slate-500 text-[10px] truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
