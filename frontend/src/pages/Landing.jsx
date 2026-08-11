import { Link } from 'react-router-dom'
import { Zap, Camera, BarChart3, Shield, ArrowRight, Play, CheckCircle } from 'lucide-react'

const features = [
  { icon: Camera,   title: 'Live Detection',     desc: 'Real-time object detection on webcam streams using YOLOv8 with 80+ COCO classes.' },
  { icon: Zap,      title: 'Apache Spark',        desc: 'Structured streaming analytics with sliding/tumbling window aggregations at scale.' },
  { icon: BarChart3, title: 'Rich Analytics',    desc: 'Interactive dashboards with Bar, Pie, Line, Area charts and live counters.' },
  { icon: Shield,   title: 'JWT Auth',            desc: 'Secure authentication with JWT tokens stored safely and MongoDB Atlas backend.' },
]

const stats = [
  { label: 'Object Classes', value: '80+' },
  { label: 'Real-Time FPS',  value: '30+' },
  { label: 'Chart Types',    value: '5' },
  { label: 'Cloud Native',   value: '100%' },
]

export default function Landing() {
  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at top, #1e1b4b 0%, #020617 60%)' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg">SparkVision</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-secondary text-sm px-4 py-2">Login</Link>
          <Link to="/register" className="btn-primary text-sm px-4 py-2">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="text-center px-8 pt-20 pb-24 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-sm text-xs text-brand-400 mb-6 border-pulse">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          YOLOv8 + Apache Spark Structured Streaming
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6">
          Real-Time{' '}
          <span className="gradient-text">Object Detection</span>
          <br />using Apache Spark
        </h1>

        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          A complete Big Data Analytics platform that streams every detection event into
          Apache Spark Structured Streaming for live aggregation and visualization.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/register" className="btn-primary flex items-center gap-2 text-base px-8 py-4">
            <Play className="w-5 h-5" />
            Start Detecting
          </Link>
          <Link to="/login" className="btn-secondary flex items-center gap-2 text-base px-8 py-4">
            View Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Stats bar */}
      <div className="max-w-4xl mx-auto px-8 mb-20">
        <div className="glass grid grid-cols-2 md:grid-cols-4 divide-x divide-brand-500/10">
          {stats.map(({ label, value }) => (
            <div key={label} className="text-center py-6 px-4">
              <p className="text-3xl font-black gradient-text">{value}</p>
              <p className="text-slate-500 text-sm mt-1">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 pb-24">
        <h2 className="text-center text-3xl font-bold text-white mb-3">Everything you need</h2>
        <p className="text-center text-slate-400 mb-12">Built for final-year Big Data Analytics projects and production deployment</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass p-6 hover:border-brand-500/30 transition-all duration-300 hover:-translate-y-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="max-w-5xl mx-auto px-8 pb-24">
        <h2 className="text-center text-2xl font-bold text-white mb-10">Technology Stack</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {['React.js', 'Tailwind CSS', 'Flask', 'YOLOv8', 'Apache Spark', 'PySpark',
            'MongoDB Atlas', 'Socket.IO', 'JWT', 'OpenCV', 'Chart.js', 'Framer Motion'].map((tech) => (
            <span key={tech} className="badge badge-purple px-3 py-1.5 text-sm">
              <CheckCircle className="w-3 h-3" />
              {tech}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center px-8 pb-24">
        <div className="glass max-w-2xl mx-auto p-12">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
          <p className="text-slate-400 mb-8">No installation required. Runs entirely in the cloud.</p>
          <Link to="/register" className="btn-primary inline-flex items-center gap-2 text-base px-10 py-4">
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
