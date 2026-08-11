import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { videoAPI, detectionAPI } from '../services/api'
import { useSocket } from '../context/SocketContext'
import { formatBytes, formatDuration, statusBadgeClass } from '../utils/helpers'
import { Upload, Play, Square, Trash2, FileVideo, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import LoadingSpinner from '../components/LoadingSpinner'

export default function VideoUpload() {
  const [videos, setVideos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadPct, setUploadPct] = useState(0)
  const [activeVideo, setActiveVideo] = useState(null)
  const [detectionFrames, setDetectionFrames] = useState([])
  const [liveDetections, setLiveDetections] = useState([])
  const { on } = useSocket()

  const fetchVideos = async () => {
    try {
      const res = await videoAPI.list(1, 20)
      setVideos(res.data.videos || [])
    } catch (e) {}
  }

  useEffect(() => { fetchVideos() }, [])

  // Listen for detection events
  useEffect(() => {
    if (!on) return
    const c1 = on('detection_frame', (data) => {
      setActiveVideo((curr) => {
        if (!curr || data.video_id === curr) {
          setLiveDetections(data.detections || [])
          if (data.frame) {
            setDetectionFrames((prev) => [data, ...prev].slice(0, 1))
          }
          return data.video_id
        }
        return curr
      })
    })
    const c2 = on('detection_complete', (data) => {
      toast.success(`Detection complete! ${data.total_detections} objects found.`)
      fetchVideos()
      setActiveVideo(null)
    })
    return () => { c1?.(); c2?.() }
  }, [on])

  const onDrop = useCallback(async (accepted) => {
    if (!accepted[0]) return
    setUploading(true)
    setUploadPct(0)
    const fd = new FormData()
    fd.append('video', accepted[0])
    try {
      const res = await videoAPI.upload(fd, (evt) => {
        setUploadPct(Math.round((evt.loaded / evt.total) * 100))
      })
      toast.success('Video uploaded!')
      setVideos((prev) => [res.data.video, ...prev])
    } catch (e) {
      toast.error(e.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'] },
    maxSize: 500 * 1024 * 1024,
    multiple: false,
  })

  const startDetection = async (videoId) => {
    try {
      await detectionAPI.start(videoId)
      setActiveVideo(videoId)
      setLiveDetections([])
      setDetectionFrames([])
      toast.success('Detection started')
      setVideos((prev) => prev.map((v) => v.id === videoId ? { ...v, status: 'processing' } : v))
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to start')
    }
  }

  const stopDetection = async (videoId) => {
    try {
      await detectionAPI.stop(videoId)
      setActiveVideo(null)
      toast('Detection stopped', { icon: '⏹️' })
      fetchVideos()
    } catch (e) {}
  }

  const deleteVideo = async (videoId) => {
    if (!confirm('Delete this video and all its detections?')) return
    try {
      await videoAPI.delete(videoId)
      setVideos((prev) => prev.filter((v) => v.id !== videoId))
      toast.success('Video deleted')
    } catch (e) {}
  }

  return (
    <div style={{ marginLeft: 'var(--sidebar-w)' }}>
      <Sidebar />
      <Navbar title="Video Upload" />
      <main className="pt-20 px-6 pb-8">

        {/* Dropzone */}
        <div {...getRootProps()}
          className={`glass border-2 border-dashed p-12 rounded-2xl text-center cursor-pointer mb-6 transition-all duration-300
            ${isDragActive ? 'border-brand-500 bg-brand-500/5 glow-brand' : 'border-brand-500/20 hover:border-brand-500/40'}`}>
          <input {...getInputProps()} id="video-file-input" />
          <FileVideo className="w-16 h-16 mx-auto mb-4 text-brand-400 opacity-60" />
          <p className="text-white font-semibold text-lg mb-2">
            {isDragActive ? 'Drop your video here!' : 'Drop a video or click to upload'}
          </p>
          <p className="text-slate-500 text-sm">MP4, AVI, MOV, MKV, WebM — max 500 MB</p>

          {uploading && (
            <div className="mt-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <LoadingSpinner size="sm" />
                <span className="text-brand-400 text-sm font-medium">Uploading… {uploadPct}%</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full max-w-xs mx-auto overflow-hidden">
                <div className="h-full bg-gradient-brand rounded-full transition-all duration-300"
                  style={{ width: `${uploadPct}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video list */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-white font-semibold">Your Videos ({videos.length})</h3>
            {videos.length === 0 ? (
              <div className="glass p-8 text-center text-slate-600">
                <Upload className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No videos yet. Upload one above.</p>
              </div>
            ) : (
              videos.map((v) => {
                const isCurrent = v.id === activeVideo
                const progressPct = isCurrent && detectionFrames[0]?.progress_pct != null
                  ? detectionFrames[0].progress_pct
                  : (v.processed_frames && v.total_frames ? Math.round((v.processed_frames / v.total_frames) * 100) : 0)

                return (
                  <div key={v.id} className="glass p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                      <FileVideo className="w-5 h-5 text-brand-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm truncate">{v.original_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-slate-500 text-xs">{formatBytes(v.file_size)}</span>
                        {v.fps > 0 && <span className="text-slate-500 text-xs">{v.fps} fps</span>}
                        {v.resolution && <span className="text-slate-500 text-xs">{v.resolution}</span>}
                        <span className={`badge ${statusBadgeClass(v.status)}`}>{v.status}</span>
                      </div>
                      {v.status === 'processing' && (
                        <div className="mt-2 space-y-1">
                          <div className="flex justify-between text-[10px] text-brand-400">
                            <span>Processing...</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-500 transition-all duration-300" style={{ width: `${Math.max(progressPct, 5)}%` }} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {v.status !== 'processing' ? (
                        <button id={`start-${v.id}`} onClick={() => startDetection(v.id)}
                          className="btn-primary px-3 py-1.5 text-xs flex items-center gap-1">
                          <Play className="w-3 h-3" /> Detect
                        </button>
                      ) : (
                        <button onClick={() => stopDetection(v.id)}
                          className="btn-danger px-3 py-1.5 text-xs flex items-center gap-1">
                          <Square className="w-3 h-3" /> Stop
                        </button>
                      )}
                      <button onClick={() => deleteVideo(v.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/10">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Live preview */}
          <div className="glass p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-brand-400" />
              Detection Preview
            </h3>
            {detectionFrames[0] ? (
              <>
                <img src={'data:image/jpeg;base64,' + detectionFrames[0].frame}
                  alt="Frame" className="rounded-xl w-full mb-3" />
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {liveDetections.map((d, i) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-brand-500/5">
                      <span className="text-slate-300 capitalize">{d.class_name}</span>
                      <span className="text-brand-400">{(d.confidence * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
                <p className="text-slate-500 text-xs mt-2">
                  Frame {detectionFrames[0].frame_number} / {detectionFrames[0].total_frames}
                </p>
              </>
            ) : (
              <div className="aspect-video bg-dark-800 rounded-xl flex items-center justify-center text-slate-600 text-sm">
                Start detection to preview
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
