import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import StatCard from '../components/StatCard'
import LiveCounter from '../charts/LiveCounter'
import BarChart from '../charts/BarChart'
import PieChart from '../charts/PieChart'
import LineChart from '../charts/LineChart'
import { analyticsAPI } from '../services/api'
import {
  Video, Eye, TrendingUp, Target, Gauge, Zap, Activity, Clock
} from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [topObjects, setTopObjects] = useState([])
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [sRes, tRes, tlRes] = await Promise.all([
        analyticsAPI.dashboard(),
        analyticsAPI.topObjects(10),
        analyticsAPI.timeline(),
      ])
      setStats(sRes.data)
      setTopObjects(tRes.data.data || [])
      setTimeline(tlRes.data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000) // refresh every 15s
    return () => clearInterval(interval)
  }, [])

  const cards = [
    { title: 'Total Videos',       value: stats?.total_videos ?? 0,      icon: Video,     gradient: 'from-blue-500 to-cyan-500',       sub: 'Uploaded videos' },
    { title: 'Objects Detected',   value: stats?.total_detections ?? 0,  icon: Eye,       gradient: 'from-brand-500 to-purple-600',    sub: 'All time' },
    { title: "Today's Detections", value: stats?.today_detections ?? 0,  icon: TrendingUp,gradient: 'from-emerald-500 to-teal-500',    sub: 'Last 24 hours' },
    { title: 'Most Detected',      value: stats?.most_detected_object || 'N/A', icon: Target, gradient: 'from-orange-500 to-amber-500', sub: 'Top object class' },
    { title: 'Avg Confidence',     value: stats?.avg_confidence != null ? `${stats.avg_confidence}%` : '0%', icon: Gauge, gradient: 'from-pink-500 to-rose-500', sub: 'Across detections' },
    { title: 'Average FPS',        value: stats?.avg_fps != null ? stats.avg_fps : 0, icon: Zap, gradient: 'from-violet-500 to-brand-500', sub: 'Detection speed' },
    { title: 'Spark Streaming',    value: stats?.spark_status || 'Fallback (Python)', icon: Activity, gradient: 'from-cyan-500 to-blue-500', sub: 'Processing mode' },
    { title: 'Avg Latency',        value: stats?.avg_latency_ms != null ? `${stats.avg_latency_ms}ms` : '0ms', icon: Clock, gradient: 'from-red-500 to-orange-500', sub: 'Processing latency' },
  ]

  return (
    <div style={{ marginLeft: 'var(--sidebar-w)' }}>
      <Sidebar />
      <Navbar title="Dashboard" />
      <main className="pt-20 px-6 pb-8" style={{ minHeight: '100vh' }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Overview</h2>
            <p className="text-slate-500 text-sm">Real-time analytics dashboard</p>
          </div>
          <div className="flex items-center gap-2 badge badge-green">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {cards.map((c) => (
            <StatCard key={c.title} loading={loading} {...c} />
          ))}
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Top objects bar */}
          <div className="lg:col-span-2 glass p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-brand-400" />
              Top Detected Objects
            </h3>
            <BarChart
              labels={topObjects.map((o) => o.object)}
              datasets={[{ label: 'Count', data: topObjects.map((o) => o.count) }]}
              height={240}
            />
          </div>

          {/* Pie chart */}
          <div className="glass p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400" />
              Distribution
            </h3>
            <PieChart
              labels={topObjects.slice(0, 6).map((o) => o.object)}
              data={topObjects.slice(0, 6).map((o) => o.count)}
              height={240}
            />
          </div>
        </div>

        {/* Timeline */}
        <div className="glass p-5 mb-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            Detection Timeline (24h)
          </h3>
          <LineChart
            labels={timeline.map((t) => t.hour)}
            datasets={[{ label: 'Detections', data: timeline.map((t) => t.count) }]}
            height={220}
          />
        </div>

        {/* Live counters row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Detections', value: stats?.total_detections || 0 },
            { label: "Today's Count",    value: stats?.today_detections || 0 },
            { label: 'Videos Processed', value: stats?.total_videos || 0 },
          ].map(({ label, value }) => (
            <div key={label} className="glass p-5 text-center">
              <LiveCounter
                value={value}
                className="text-4xl font-black gradient-text"
              />
              <p className="text-slate-400 text-sm mt-2">{label}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
