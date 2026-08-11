import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { reportsAPI } from '../services/api'
import { formatDate, downloadBlob } from '../utils/helpers'
import { FileText, Download, Loader, FileSpreadsheet, File } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

const REPORT_TYPES = [
  { type: 'csv',   label: 'CSV Export',        desc: 'All detection records as CSV', icon: FileText,        gradient: 'from-emerald-500 to-teal-600' },
  { type: 'excel', label: 'Excel Workbook',    desc: 'Detection + Summary sheets',  icon: FileSpreadsheet,  gradient: 'from-green-500 to-emerald-600' },
  { type: 'pdf',   label: 'PDF Report',        desc: 'Formatted table up to 500 rows', icon: File,          gradient: 'from-red-500 to-rose-600' },
]

export default function Reports() {
  const [reports, setReports] = useState([])
  const [generating, setGenerating] = useState(null)
  const [downloading, setDownloading] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchReports = async () => {
    try {
      const res = await reportsAPI.list()
      setReports(res.data.reports || [])
    } catch (e) {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchReports() }, [])

  const generate = async (type) => {
    setGenerating(type)
    try {
      await reportsAPI.generate(type)
      toast.success(`${type.toUpperCase()} report generated! Download it below.`)
      await fetchReports()
    } catch (e) {
      toast.error(e.response?.data?.error || 'Generation failed')
    } finally {
      setGenerating(null)
    }
  }

  const handleDownload = async (id, type) => {
    setDownloading(id)
    try {
      const res = await reportsAPI.download(id)
      const exts = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' }
      downloadBlob(res.data, `sparkvision_report.${exts[type] || 'bin'}`)
      toast.success('Downloaded!')
    } catch { toast.error('Download failed') }
    finally { setDownloading(null) }
  }

  const typeIcon = { csv: FileText, excel: FileSpreadsheet, pdf: File }
  const typeColor = { csv: 'badge-green', excel: 'badge-green', pdf: 'badge-red' }

  return (
    <div style={{ marginLeft: 'var(--sidebar-w)' }}>
      <Sidebar />
      <Navbar title="Reports" />
      <main className="pt-20 px-6 pb-8">

        <div className="mb-6">
          <h2 className="text-xl font-bold text-white">Generate Reports</h2>
          <p className="text-slate-500 text-sm">Export your detection data as CSV, Excel, or PDF</p>
        </div>

        {/* Report type cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {REPORT_TYPES.map(({ type, label, desc, icon: Icon, gradient }) => (
            <div key={type} className="glass p-6 hover:border-brand-500/30 transition-all hover:-translate-y-0.5">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-1">{label}</h3>
              <p className="text-slate-500 text-sm mb-4">{desc}</p>
              <button id={`gen-${type}`} onClick={() => generate(type)}
                disabled={!!generating}
                className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm">
                {generating === type ? (
                  <><LoadingSpinner size="sm" /> Generating…</>
                ) : (
                  <><Download className="w-4 h-4" /> Generate {type.toUpperCase()}</>
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Recent reports */}
        <div className="glass p-5">
          <h3 className="text-white font-semibold mb-4">Recent Reports</h3>
          {loading ? (
            <div className="flex justify-center py-8"><LoadingSpinner /></div>
          ) : reports.length === 0 ? (
            <div className="text-center py-10 text-slate-600">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No reports generated yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-dark">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Generated At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => {
                    const IconComp = typeIcon[r.type] || FileText
                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <IconComp className="w-4 h-4 text-slate-400" />
                            <span className={`badge ${typeColor[r.type]}`}>{r.type.toUpperCase()}</span>
                          </div>
                        </td>
                        <td className="text-slate-400 text-sm">{formatDate(r.created_at)}</td>
                        <td>
                          <button onClick={() => handleDownload(r.id, r.type)}
                            disabled={downloading === r.id}
                            className="btn-secondary px-3 py-1 text-xs flex items-center gap-1">
                            {downloading === r.id ? <Loader className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                            Download
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
