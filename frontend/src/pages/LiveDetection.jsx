import { useState, useRef, useEffect, useCallback } from 'react'
import Sidebar from '../components/Sidebar'
import Navbar from '../components/Navbar'
import { useSocket } from '../context/SocketContext'
import { useAuth } from '../context/AuthContext'
import { Camera, CameraOff, Zap, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LiveDetection() {
  const { socket, connected, on, emit } = useSocket()
  const { token } = useAuth()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const intervalRef = useRef(null)

  const [active, setActive] = useState(false)
  const [detections, setDetections] = useState([])
  const [fps, setFps] = useState(0)
  const [latency, setLatency] = useState(0)
  const [annotatedFrame, setAnnotatedFrame] = useState(null)

  // Start webcam
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } })
      if (videoRef.current) videoRef.current.srcObject = stream
      streamRef.current = stream
      setActive(true)
      toast.success('Camera started')
    } catch (e) {
      toast.error('Camera access denied: ' + e.message)
    }
  }

  // Stop webcam
  const stopCamera = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    if (videoRef.current) videoRef.current.srcObject = null
    streamRef.current = null
    setActive(false)
    setAnnotatedFrame(null)
    setDetections([])
  }

  // Capture + send frames via Socket.IO
  useEffect(() => {
    if (!active || !connected) return

    const captureAndSend = () => {
      const video = videoRef.current
      if (!video || video.paused || video.ended) return

      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      canvas.getContext('2d').drawImage(video, 0, 0)
      const b64 = canvas.toDataURL('image/jpeg', 0.7).split(',')[1]
      emit('webcam_frame', { token, frame: b64 })
    }

    intervalRef.current = setInterval(captureAndSend, 100) // ~10 fps send rate
    return () => clearInterval(intervalRef.current)
  }, [active, connected, emit, token])

  // Receive results
  useEffect(() => {
    if (!on) return
    const cleanup = on('webcam_result', (data) => {
      setDetections(data.detections || [])
      setFps(data.fps || 0)
      setLatency(data.processing_time_ms || 0)
      if (data.frame) setAnnotatedFrame('data:image/jpeg;base64,' + data.frame)
    })
    return cleanup
  }, [on])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [])

  return (
    <div style={{ marginLeft: 'var(--sidebar-w)' }}>
      <Sidebar />
      <Navbar title="Live Detection" />
      <main className="pt-20 px-6 pb-8">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Webcam Object Detection</h2>
            <p className="text-slate-500 text-sm">YOLOv8 + Apache Spark Streaming</p>
          </div>
          <div className="flex gap-3">
            {!active ? (
              <button id="start-camera" onClick={startCamera} className="btn-primary flex items-center gap-2">
                <Camera className="w-4 h-4" /> Start Camera
              </button>
            ) : (
              <button id="stop-camera" onClick={stopCamera} className="btn-danger flex items-center gap-2">
                <CameraOff className="w-4 h-4" /> Stop
              </button>
            )}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video feed */}
          <div className="lg:col-span-2">
            <div className="glass p-4">
              <div className="relative aspect-video bg-dark-800 rounded-xl overflow-hidden">
                {annotatedFrame ? (
                  <img src={annotatedFrame} alt="Annotated" className="w-full h-full object-contain" />
                ) : (
                  <video ref={videoRef} autoPlay playsInline muted
                    className="w-full h-full object-contain" />
                )}

                {!active && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
                    <Camera className="w-16 h-16 mb-3 opacity-30" />
                    <p className="text-sm">Click "Start Camera" to begin</p>
                  </div>
                )}

                {/* Live badge */}
                {active && (
                  <div className="absolute top-3 left-3 badge badge-red flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" /> LIVE
                  </div>
                )}

                {/* FPS / Latency overlay */}
                {active && (
                  <div className="absolute top-3 right-3 flex gap-2">
                    <span className="badge badge-green">{fps.toFixed(1)} FPS</span>
                    <span className="badge badge-blue">{latency.toFixed(0)}ms</span>
                  </div>
                )}
              </div>

              {/* Socket warning */}
              {!connected && (
                <div className="flex items-center gap-2 mt-3 text-yellow-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Socket.IO disconnected — real-time detection unavailable
                </div>
              )}
            </div>
          </div>

          {/* Detections panel */}
          <div className="glass p-5 flex flex-col">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="w-4 h-4 text-brand-400" />
              <h3 className="text-white font-semibold">Live Detections</h3>
              <span className="badge badge-purple ml-auto">{detections.length}</span>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto max-h-[500px]">
              {detections.length === 0 ? (
                <p className="text-slate-600 text-sm text-center py-8">
                  {active ? 'Waiting for detections…' : 'Start camera to detect'}
                </p>
              ) : (
                detections.map((det, i) => (
                  <div key={i} className="glass-sm p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white text-sm font-medium capitalize">{det.class_name}</p>
                      <p className="text-slate-500 text-xs">
                        [{det.bbox?.join(', ')}]
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-brand-400 font-semibold text-sm">
                        {(det.confidence * 100).toFixed(1)}%
                      </p>
                      {/* Confidence bar */}
                      <div className="w-16 h-1 bg-slate-700 rounded mt-1">
                        <div className="h-1 rounded bg-brand-500 transition-all"
                          style={{ width: `${det.confidence * 100}%` }} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Stats */}
            <div className="border-t border-brand-500/10 pt-3 mt-3 grid grid-cols-2 gap-2">
              <div className="glass-sm p-2 text-center">
                <p className="text-white font-bold">{fps.toFixed(1)}</p>
                <p className="text-slate-500 text-xs">FPS</p>
              </div>
              <div className="glass-sm p-2 text-center">
                <p className="text-white font-bold">{latency.toFixed(0)}ms</p>
                <p className="text-slate-500 text-xs">Latency</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
