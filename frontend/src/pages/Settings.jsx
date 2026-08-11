import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../services/api'
import { Bell, Eye, Sliders, Database, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Settings() {
  const { user, updateUser } = useAuth()
  const [settings, setSettings] = useState({
    notifications: user?.settings?.notifications ?? true,
    theme: user?.settings?.theme ?? 'dark',
    confidence_threshold: user?.settings?.confidence_threshold ?? 0.4,
    frame_skip: user?.settings?.frame_skip ?? 2,
  })
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const res = await authAPI.updateProfile({ settings })
      updateUser(res.data.user)
      toast.success('Settings saved')
    } catch { toast.error('Save failed') }
    finally { setSaving(false) }
  }

  const update = (key, val) => setSettings((s) => ({ ...s, [key]: val }))

  return (
    <div style={{ marginLeft: 'var(--sidebar-w)' }}>
      <Sidebar />
      <Navbar title="Settings" />
      <main className="pt-20 px-6 pb-8 max-w-2xl">

        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <p className="text-slate-500 text-sm">Customize your detection preferences</p>
        </div>

        <div className="space-y-5">
          {/* Notifications */}
          <div className="glass p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-400" /> Notifications
            </h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white text-sm">Detection Alerts</p>
                <p className="text-slate-500 text-xs">Get notified when detection completes</p>
              </div>
              <button
                id="toggle-notifications"
                onClick={() => update('notifications', !settings.notifications)}
                className={`relative w-12 h-6 rounded-full transition-colors ${settings.notifications ? 'bg-brand-500' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.notifications ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </div>

          {/* Detection settings */}
          <div className="glass p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" /> Detection Settings
            </h3>
            <div className="space-y-5">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400">Confidence Threshold</label>
                  <span className="text-brand-400 text-sm font-semibold">{(settings.confidence_threshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  id="confidence-slider"
                  type="range" min="0.1" max="0.95" step="0.05"
                  value={settings.confidence_threshold}
                  onChange={(e) => update('confidence_threshold', parseFloat(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>10% (more objects)</span>
                  <span>95% (fewer, high quality)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm text-slate-400">Frame Skip</label>
                  <span className="text-brand-400 text-sm font-semibold">Every {settings.frame_skip} frames</span>
                </div>
                <input
                  id="frame-skip-slider"
                  type="range" min="1" max="10" step="1"
                  value={settings.frame_skip}
                  onChange={(e) => update('frame_skip', parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>1 (every frame, slow)</span>
                  <span>10 (fast, fewer detections)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Performance */}
          <div className="glass p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" /> Performance
            </h3>
            <div className="space-y-3 text-sm text-slate-400">
              <div className="flex justify-between items-center py-2 border-b border-brand-500/5">
                <span>YOLO Model</span>
                <span className="badge badge-purple">YOLOv8n (Nano)</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-brand-500/5">
                <span>Spark Mode</span>
                <span className="badge badge-blue">local[*]</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span>Database</span>
                <span className="badge badge-green">MongoDB Atlas</span>
              </div>
            </div>
          </div>

          {/* Danger zone */}
          <div className="glass p-5 border border-red-500/10">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Database className="w-4 h-4 text-red-400" /> Data
            </h3>
            <p className="text-slate-500 text-sm mb-4">
              Your detection history and videos are stored in MongoDB Atlas and persist across sessions.
            </p>
          </div>

          {/* Save */}
          <button id="save-settings" onClick={save} disabled={saving}
            className="btn-primary flex items-center gap-2 w-full justify-center py-3">
            {saving ? <LoadingSpinner size="sm" /> : <Save className="w-4 h-4" />}
            Save Settings
          </button>
        </div>
      </main>
    </div>
  )
}
