# 🚀 SparkVision — Real-Time Object Detection using Apache Spark Video Streaming

<div align="center">

![SparkVision Banner](https://img.shields.io/badge/SparkVision-YOLOv8%20%2B%20Apache%20Spark-6366f1?style=for-the-badge)
![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Apache Spark](https://img.shields.io/badge/Apache%20Spark-3.5-E25A1C?style=flat-square&logo=apachespark)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb)
![YOLOv8](https://img.shields.io/badge/YOLOv8-Ultralytics-00FFCD?style=flat-square)

**A complete cloud-based Big Data Analytics platform for real-time object detection.**
</div>

---

## 📋 Project Objective

Perform real-time object detection on uploaded videos and live webcam streams using **YOLOv8**. Stream every detection event into **Apache Spark Structured Streaming** to perform real-time analytics and visualize the results on a professional dashboard.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Chart.js, Socket.IO Client |
| **Backend** | Python Flask, Flask-SocketIO, Flask-JWT-Extended |
| **Computer Vision** | YOLOv8 (Ultralytics), OpenCV |
| **Big Data** | Apache Spark 3.5, PySpark, Spark SQL |
| **Database** | MongoDB Atlas (Cloud) |
| **Auth** | JWT Tokens |
| **Deployment** | Render.com (backend) + Vercel (frontend) |

---

## 📁 Folder Structure

```
BDA Project/
├── backend/
│   ├── app.py                    # Flask entry point
│   ├── config.py                 # Environment config
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Env template
│   ├── database/
│   │   └── connection.py         # MongoDB Atlas connection
│   ├── models/
│   │   ├── user.py               # User schema
│   │   ├── detection.py          # Detection event schema
│   │   ├── video.py              # Video metadata schema
│   │   └── report.py             # Report schema
│   ├── routes/
│   │   ├── auth.py               # Register, Login, Profile
│   │   ├── video.py              # Upload, List, Delete
│   │   ├── detection.py          # Start/Stop detection
│   │   ├── analytics.py          # Dashboard analytics
│   │   ├── history.py            # Detection history CRUD
│   │   └── reports.py            # CSV/Excel/PDF export
│   ├── services/
│   │   ├── detection_service.py  # YOLOv8 pipeline
│   │   ├── stream_service.py     # Socket.IO webcam handler
│   │   └── report_service.py     # Report generation
│   ├── spark/
│   │   ├── spark_session.py      # PySpark session factory
│   │   ├── streaming.py          # Structured Streaming pipeline
│   │   └── analytics.py         # Spark SQL aggregations
│   ├── yolo/
│   │   └── detector.py           # YOLOv8 wrapper
│   ├── uploads/                  # Uploaded videos
│   └── reports/                  # Generated reports
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── src/
│   │   ├── App.jsx               # Router + providers
│   │   ├── index.css             # Global styles
│   │   ├── pages/
│   │   │   ├── Landing.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx     # Main dashboard with 8 cards
│   │   │   ├── LiveDetection.jsx # Webcam real-time detection
│   │   │   ├── VideoUpload.jsx   # Upload + start detection
│   │   │   ├── Analytics.jsx     # Full analytics dashboard
│   │   │   ├── History.jsx       # Detection history table
│   │   │   ├── Reports.jsx       # CSV/Excel/PDF reports
│   │   │   ├── Profile.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── StatCard.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   ├── charts/
│   │   │   ├── BarChart.jsx
│   │   │   ├── PieChart.jsx
│   │   │   ├── LineChart.jsx
│   │   │   ├── AreaChart.jsx
│   │   │   ├── HeatmapChart.jsx
│   │   │   └── LiveCounter.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx   # JWT auth state
│   │   │   └── SocketContext.jsx # Socket.IO connection
│   │   ├── services/
│   │   │   └── api.js            # Axios API client
│   │   └── utils/
│   │       └── helpers.js        # Utilities
│
├── render.yaml                   # Render.com deploy config
├── vercel.json                   # Vercel deploy config
└── README.md
```

---

## 🌐 Pages

| Page | Route | Description |
|---|---|---|
| Landing | `/` | Marketing page with features |
| Login | `/login` | JWT authentication |
| Register | `/register` | Create account |
| Dashboard | `/dashboard` | 8 KPI cards + charts |
| Live Detection | `/live` | Webcam + Socket.IO detection |
| Video Upload | `/upload` | Drag-and-drop, detect, preview |
| Analytics | `/analytics` | 5 chart types + Spark results |
| History | `/history` | Searchable detection table |
| Reports | `/reports` | CSV / Excel / PDF export |
| Profile | `/profile` | Edit profile + stats |
| Settings | `/settings` | Confidence, frame skip, prefs |

---

## 📊 Dashboard KPI Cards

1. **Total Videos** — uploaded video count
2. **Objects Detected** — all-time detection count
3. **Today's Detections** — last 24h count
4. **Most Detected Object** — top COCO class
5. **Average Confidence** — mean detection confidence %
6. **Average FPS** — processing speed
7. **Spark Streaming Status** — `Running (local[*])` or `Fallback (Python)`
8. **Processing Latency** — avg inference time in ms

---

## ⚡ Apache Spark Integration

Every detection event is pushed into a thread-safe in-process queue that acts as the Spark Structured Streaming source.

```
Detection → push_detection() → Queue → Spark Batch
         → createDataFrame() → Tumbling Window Aggregation
         → count/avg per class → stored in _streaming_results
         → exposed via /api/analytics/spark-results
```

Aggregations performed:
- Object count per class (tumbling window)
- Average confidence per class
- Average FPS per class
- Top 10 objects ranking

---

## 🚀 Deployment Guide

### Option A: Replit / GitHub Codespaces (Zero-install, browser-based)

1. Fork this repo
2. Open in Replit or Codespaces
3. Set environment variables (see below)
4. Run backend: `cd backend && pip install -r requirements.txt && python app.py`
5. Run frontend: `cd frontend && npm install && npm run dev`

### Option B: Render.com (Backend) + Vercel (Frontend)

**Backend on Render:**
1. Connect GitHub repo to Render
2. New Web Service → Root dir: `backend`
3. Build: `pip install -r requirements.txt`
4. Start: `gunicorn --worker-class eventlet -w 1 app:app`
5. Add env vars (see below)

**Frontend on Vercel:**
1. Connect GitHub repo to Vercel
2. Root dir: `frontend`
3. Set `VITE_API_URL` → your Render backend URL + `/api`

### Environment Variables

**Backend:**
```
MONGO_URI=mongodb+srv://...
JWT_SECRET_KEY=your-secret
SECRET_KEY=your-flask-secret
FRONTEND_URL=https://your-vercel-app.vercel.app
```

**Frontend:**
```
VITE_API_URL=https://your-render-app.onrender.com/api
```

---

## 🔌 REST API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login, get JWT |
| GET | `/api/auth/profile` | Get profile |
| PUT | `/api/auth/profile` | Update profile |

### Videos
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/videos/upload` | Upload video |
| GET | `/api/videos/` | List videos |
| GET | `/api/videos/<id>` | Get video |
| DELETE | `/api/videos/<id>` | Delete video |

### Detection
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/detection/start/<id>` | Start YOLOv8 detection |
| POST | `/api/detection/stop/<id>` | Stop detection |
| GET | `/api/detection/status/<id>` | Get status |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/analytics/dashboard` | All 8 KPI cards |
| GET | `/api/analytics/top-objects` | Top N object classes |
| GET | `/api/analytics/timeline` | Hourly counts |
| GET | `/api/analytics/confidence-distribution` | Confidence buckets |
| GET | `/api/analytics/spark-results` | Spark aggregations |

### History
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/history/` | Paginated history |
| DELETE | `/api/history/<id>` | Delete record |
| GET | `/api/history/export/csv` | Export all as CSV |

### Reports
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/reports/generate` | Generate report |
| GET | `/api/reports/download/<id>` | Download report |
| GET | `/api/reports/list` | List reports |

### Socket.IO Events
| Event | Direction | Description |
|---|---|---|
| `join` | Client → Server | Join user room |
| `webcam_frame` | Client → Server | Send base64 webcam frame |
| `webcam_result` | Server → Client | Annotated frame + detections |
| `detection_frame` | Server → Client | Video detection progress |
| `detection_complete` | Server → Client | Video detection done |

---

## 🏗️ Architecture Diagram

```
Browser
  │
  ├─── React Frontend (Vercel)
  │     ├── Socket.IO Client ────────────────────────────┐
  │     └── Axios HTTP ──────────────────────────────┐   │
  │                                                   │   │
  └─── Flask Backend (Render)                        │   │
        ├── REST API ←──────────────────────────────┘   │
        ├── Socket.IO Server ←────────────────────────┘
        │     └── Webcam frames → YOLO → annotated frame
        │
        ├── YOLOv8 Detector (Ultralytics)
        │     └── Frame → detect() → bboxes + confidence
        │
        ├── Detection Service (thread per video)
        │     └── Video frames → YOLO → MongoDB + Socket.IO
        │
        ├── Spark Streaming (local[*])
        │     └── Queue → batch → DataFrame → tumbling window agg
        │
        └── MongoDB Atlas ←── all persistent data
```

---

## 📝 License

MIT License — free for academic and commercial use.

---

