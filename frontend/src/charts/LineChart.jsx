import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function LineChart({ labels = [], datasets = [], height = 280 }) {
  const data = {
    labels,
    datasets: datasets.map((ds, i) => ({
      borderColor: i === 0 ? '#6366f1' : '#8b5cf6',
      backgroundColor: i === 0 ? 'rgba(99,102,241,0.1)' : 'rgba(139,92,246,0.1)',
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: i === 0 ? '#6366f1' : '#8b5cf6',
      tension: 0.4,
      fill: true,
      ...ds,
    })),
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { intersect: false, mode: 'index' },
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 }, usePointStyle: true } },
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor: 'rgba(99,102,241,0.3)',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
      },
    },
    scales: {
      x: { ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(99,102,241,0.05)' } },
      y: { ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } }, grid: { color: 'rgba(99,102,241,0.08)' } },
    },
  }

  return <div style={{ height }}><Line data={data} options={options} /></div>
}
