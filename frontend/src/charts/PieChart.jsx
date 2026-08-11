import {
  Chart as ChartJS, ArcElement, Tooltip, Legend
} from 'chart.js'
import { Pie } from 'react-chartjs-2'
import { chartColors } from '../utils/helpers'

ChartJS.register(ArcElement, Tooltip, Legend)

export default function PieChart({ labels = [], data = [], height = 280 }) {
  const chartData = {
    labels,
    datasets: [{
      data,
      backgroundColor: chartColors.slice(0, labels.length),
      borderColor: 'rgba(15,23,42,0.8)',
      borderWidth: 2,
      hoverOffset: 8,
    }],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#94a3b8',
          font: { family: 'Inter', size: 11 },
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 8,
        },
      },
      tooltip: {
        backgroundColor: '#1e293b',
        borderColor: 'rgba(99,102,241,0.3)',
        borderWidth: 1,
        titleColor: '#e2e8f0',
        bodyColor: '#94a3b8',
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0)
            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : '0.0'
            return ` ${ctx.label}: ${ctx.raw} (${pct}%)`
          },
        },
      },
    },
  }

  return (
    <div style={{ height }}>
      <Pie data={chartData} options={options} />
    </div>
  )
}
