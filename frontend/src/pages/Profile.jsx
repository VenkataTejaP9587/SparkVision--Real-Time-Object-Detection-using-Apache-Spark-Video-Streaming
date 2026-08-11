import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { User, Mail, Shield, Calendar, Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'
import { formatDate } from '../utils/helpers'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ username: user?.username || '' })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await authAPI.updateProfile({ username: form.username })
      updateUser(res.data.user)
      setEditing(false)
      toast.success('Profile updated')
    } catch { toast.error('Update failed') }
    finally { setSaving(false) }
  }

  const stats = [
    { icon: Activity, label: 'Total Detections', value: user?.stats?.total_detections || 0 },
    { icon: Shield,   label: 'Account Role',     value: user?.role || 'user' },
    { icon: Calendar, label: 'Member Since',     value: formatDate(user?.created_at)?.split(',')[0] || '—' },
  ]

  return (
    <div style={{ marginLeft: 'var(--sidebar-w)' }}>
      <Sidebar />
      <Navbar title="Profile" />
      <main className="pt-20 px-6 pb-8 max-w-3xl">

        {/* Avatar card */}
        <div className="glass p-8 mb-6 flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-brand flex items-center justify-center text-white text-3xl font-bold glow-brand">
            {user?.username?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            {editing ? (
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input-dark text-xl font-bold mb-1"
              />
            ) : (
              <h2 className="text-2xl font-bold text-white">{user?.username}</h2>
            )}
            <p className="text-slate-400 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" /> {user?.email}
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="btn-secondary text-sm px-3 py-2">Cancel</button>
                <button onClick={save} disabled={saving} className="btn-primary text-sm px-3 py-2 flex items-center gap-2">
                  {saving ? <LoadingSpinner size="sm" /> : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn-secondary text-sm px-4 py-2">Edit Profile</button>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="glass p-5">
              <Icon className="w-5 h-5 text-brand-400 mb-2" />
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-slate-500 text-sm">{label}</p>
            </div>
          ))}
        </div>

        {/* Account info */}
        <div className="glass p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-400" /> Account Details
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Username', value: user?.username },
              { label: 'Email',    value: user?.email },
              { label: 'Role',     value: user?.role },
              { label: 'User ID',  value: user?.id },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-brand-500/5">
                <span className="text-slate-400 text-sm">{label}</span>
                <span className="text-white text-sm font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
