import { useState, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { historyAPI } from '../services/api'
import { formatDate, downloadBlob, statusBadgeClass } from '../utils/helpers'
import { Search, Filter, Trash2, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function History() {
  const [records, setRecords] = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [pages, setPages]     = useState(1)
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const fetchHistory = useCallback(async (pg = 1, q = '') => {
    setLoading(true)
    try {
      const res = await historyAPI.list({ page: pg, per_page: 20, search: q })
      setRecords(res.data.records || [])
      setTotal(res.data.total || 0)
      setPages(res.data.pages || 1)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchHistory(page, search) }, [page, search, fetchHistory])

  const handleSearch = (e) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const deleteRecord = async (id) => {
    try {
      await historyAPI.delete(id)
      setRecords((prev) => prev.filter((r) => r.id !== id))
      setTotal((t) => t - 1)
      toast.success('Record deleted')
    } catch { toast.error('Delete failed') }
  }

  const exportCSV = async () => {
    setExporting(true)
    try {
      const res = await historyAPI.exportCSV()
      downloadBlob(res.data, 'detections.csv')
      toast.success('CSV exported')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  return (
    <div style={{ marginLeft: 'var(--sidebar-w)' }}>
      <Sidebar />
      <Navbar title="Detection History" />
      <main className="pt-20 px-6 pb-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Detection History</h2>
            <p className="text-slate-500 text-sm">{total.toLocaleString()} total records</p>
          </div>
          <button id="export-csv" onClick={exportCSV} disabled={exporting}
            className="btn-secondary flex items-center gap-2 text-sm px-4 py-2">
            {exporting ? <LoadingSpinner size="sm" /> : <Download className="w-4 h-4" />}
            Export CSV
          </button>
        </div>

        {/* Search */}
        <div className="glass p-4 mb-5 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input id="history-search" type="text" value={search} onChange={handleSearch}
              placeholder="Search by object class…"
              className="input-dark pl-9 text-sm" />
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Filter className="w-4 h-4" />
            {records.length} shown
          </div>
        </div>

        {/* Table */}
        <div className="glass overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>Object</th>
                    <th>Confidence</th>
                    <th>Frame</th>
                    <th>Timestamp</th>
                    <th>FPS</th>
                    <th>Latency</th>
                    <th>Source</th>
                    <th>Spark Batch</th>
                    <th>Detected At</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {records.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-600">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.id}>
                        <td>
                          <span className="badge badge-purple capitalize">{r.object_class}</span>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-brand-500 rounded-full"
                                style={{ width: `${r.confidence * 100}%` }} />
                            </div>
                            <span className="text-xs text-slate-300">{(r.confidence * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="text-slate-400">#{r.frame_number}</td>
                        <td className="text-slate-400">{r.timestamp?.toFixed(2)}s</td>
                        <td className="text-slate-400">{r.fps}</td>
                        <td className="text-slate-400">{r.processing_time_ms}ms</td>
                        <td><span className={`badge ${r.source === 'webcam' ? 'badge-blue' : 'badge-green'}`}>{r.source}</span></td>
                        <td className="text-slate-500 text-xs font-mono">{r.spark_batch_id?.slice(-10) || '—'}</td>
                        <td className="text-slate-500 text-xs">{formatDate(r.created_at)}</td>
                        <td>
                          <button onClick={() => deleteRecord(r.id)}
                            className="p-1 text-slate-600 hover:text-red-400 transition-colors rounded hover:bg-red-500/10">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-brand-500/10">
              <p className="text-slate-500 text-sm">Page {page} of {pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="btn-secondary px-2 py-1 text-xs">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                  className="btn-secondary px-2 py-1 text-xs">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
