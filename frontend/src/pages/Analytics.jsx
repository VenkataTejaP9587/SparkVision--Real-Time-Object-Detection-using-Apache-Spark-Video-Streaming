import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import BarChart from '../charts/BarChart'
import PieChart from '../charts/PieChart'
import LineChart from '../charts/LineChart'
import AreaChart from '../charts/AreaChart'
import HeatmapChart from '../charts/HeatmapChart'
import { analyticsAPI } from '../services/api'
import { RefreshCw, BarChart3, Activity, Zap } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

export default function Analytics() {
  const [topObjects, setTopObjects] = useState([])
  const [timeline, setTimeline] = useState([])
  const [confDist, setConfDist] = useState([])
  const [spark, setSpark] = useState({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchAll = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    try {
      const [t, tl, cd, sp] = await Promise.all([
        analyticsAPI.topObjects(10),
        analyticsAPI.timeline(),
        analyticsAPI.confidenceDistribution(),
        analyticsAPI.sparkResults(),
      ])
      setTopObjects(t.data.data || [])
      setTimeline(tl.data.data || [])
      setConfDist(cd.data.data || [])
      setSpark(sp.data.data || {})
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchAll() }, [])

  const sparkObjects = spark.top_objects || []

  return (
    <div style={{ marginLeft: 'var(--sidebar-w)' }}>
      <Sidebar />
      <Navbar title="Analytics" />
      <main className="pt-20 px-6 pb-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
            <p className="text-slate-500 text-sm">Spark Streaming + MongoDB aggregations</p>
          </div>
          <div className="flex items-center gap-3">
            {spark.spark_mode && (
              <span className="badge badge-purple text-xs">
                <Zap className="w-3 h-3" />
                {spark.spark_mode}
              </span>
            )}
            <button onClick={() => fetchAll(true)} id="refresh-analytics"
              className="btn-secondary flex items-center gap-2 text-sm px-3 py-2">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24"><LoadingSpinner size="lg" text="Loading analytics…" /></div>
        ) : (
          <div className="space-y-6">

            {/* Row 1: Bar + Pie */}
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 glass p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-brand-400" />
                  Top 10 Detected Objects
                </h3>
                <BarChart
                  labels={topObjects.map((o) => o.object)}
                  datasets={[
                    { label: 'Count', data: topObjects.map((o) => o.count) },
                  ]}
                  height={280}
                />
              </div>
              <div className="glass p-5">
                <h3 className="text-white font-semibold mb-4">Class Distribution</h3>
                <PieChart
                  labels={topObjects.slice(0, 7).map((o) => o.object)}
                  data={topObjects.slice(0, 7).map((o) => o.count)}
                  height={280}
                />
              </div>
            </div>

            {/* Row 2: Timeline line + Confidence area */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass p-5">
                <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  Detection Timeline (24h)
                </h3>
                <LineChart
                  labels={timeline.map((t) => t.hour)}
                  datasets={[{ label: 'Detections per Hour', data: timeline.map((t) => t.count) }]}
                  height={240}
                />
              </div>
              <div className="glass p-5">
                <h3 className="text-white font-semibold mb-4">Confidence Distribution</h3>
                <AreaChart
                  labels={confDist.map((c) => c.range)}
                  datasets={[{ label: 'Count', data: confDist.map((c) => c.count) }]}
                  height={240}
                />
              </div>
            </div>

            {/* Row 3: Spark aggregation bar + Heatmap */}
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="glass p-5">
                <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-400" />
                  Spark Streaming Aggregations
                </h3>
                <p className="text-slate-500 text-xs mb-4">Live tumbling window results</p>
                {sparkObjects.length > 0 ? (
                  <BarChart
                    labels={sparkObjects.map((o) => o.object_class)}
                    datasets={[{ label: 'Spark Count', data: sparkObjects.map((o) => o.count) }]}
                    height={240}
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
                    No streaming data yet — start a detection to populate
                  </div>
                )}
              </div>

              <div className="glass p-5">
                <h3 className="text-white font-semibold mb-4">Detection Heatmap (24h)</h3>
                <HeatmapChart
                  data={timeline.map((t) => ({ label: t.hour, count: t.count }))}
                  height={240}
                />
              </div>
            </div>

            {/* Confidence avg table */}
            <div className="glass p-5">
              <h3 className="text-white font-semibold mb-4">Per-Class Confidence</h3>
              <div className="overflow-x-auto">
                <table className="table-dark">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Object Class</th>
                      <th>Detection Count</th>
                      <th>Avg Confidence</th>
                      <th>Confidence Bar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topObjects.map((obj, i) => (
                      <tr key={obj.object}>
                        <td className="text-slate-500">{i + 1}</td>
                        <td className="text-white font-medium capitalize">{obj.object}</td>
                        <td>{obj.count.toLocaleString()}</td>
                        <td>
                          <span className={`badge ${obj.avg_confidence > 80 ? 'badge-green' : obj.avg_confidence > 60 ? 'badge-yellow' : 'badge-red'}`}>
                            {obj.avg_confidence}%
                          </span>
                        </td>
                        <td>
                          <div className="w-24 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 rounded-full"
                              style={{ width: `${obj.avg_confidence}%` }} />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
