/**
 * Utility helpers for the BDA frontend.
 */

/** Format bytes to human-readable string */
export const formatBytes = (bytes, decimals = 2) => {
  if (!bytes) return '0 B'
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

/** Format seconds to MM:SS */
export const formatDuration = (seconds) => {
  if (!seconds) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Format an ISO date string to locale */
export const formatDate = (isoStr) => {
  if (!isoStr) return '—'
  return new Date(isoStr).toLocaleString()
}

/** Download a Blob as a file */
export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** Throttle a function */
export const throttle = (fn, delay) => {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last >= delay) {
      last = now
      fn(...args)
    }
  }
}

/** Get status badge class */
export const statusBadgeClass = (status) => {
  const map = {
    done:       'badge-green',
    processing: 'badge-yellow',
    uploaded:   'badge-blue',
    error:      'badge-red',
    stopped:    'badge-red',
  }
  return map[status] || 'badge-purple'
}

/** Generate chart color palette */
export const chartColors = [
  'rgba(99, 102, 241, 0.8)',
  'rgba(139, 92, 246, 0.8)',
  'rgba(168, 85, 247, 0.8)',
  'rgba(59, 130, 246, 0.8)',
  'rgba(6, 182, 212, 0.8)',
  'rgba(16, 185, 129, 0.8)',
  'rgba(245, 158, 11, 0.8)',
  'rgba(239, 68, 68, 0.8)',
  'rgba(236, 72, 153, 0.8)',
  'rgba(20, 184, 166, 0.8)',
]

export const chartBorderColors = chartColors.map((c) => c.replace('0.8', '1'))

/** Truncate text */
export const truncate = (str, n = 30) =>
  str && str.length > n ? str.substring(0, n) + '…' : str
