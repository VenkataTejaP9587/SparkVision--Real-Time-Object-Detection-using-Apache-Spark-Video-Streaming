import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { chartColors, chartBorderColors } from '../utils/helpers'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const defaultOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } },
    },
    tooltip: {
      backgroundColor: '#1e293b',
      borderColor: 'rgba(99,102,241,0.3)',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
    },
  },
  scales: {
    x: {
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
      grid:  { color: 'rgba(99,102,241,0.05)' },
    },
    y: {
      ticks: { color: '#64748b', font: { family: 'Inter', size: 11 } },
      grid:  { color: 'rgba(99,102,241,0.08)' },
    },
  },
}

export default function BarChart({ labels = [], datasets = [], title = '', height = 280 }) {
  const data = {
    labels,
    datasets: datasets.map((ds, i) => ({
      backgroundColor: chartColors[i % chartColors.length],
      borderColor: chartBorderColors[i % chartBorderColors.length],
      borderWidth: 1,
      borderRadius: 6,
      ...ds,
    })),
  }

  const options = {
    ...defaultOptions,
    plugins: {
      ...defaultOptions.plugins,
      title: title ? { display: true, text: title, color: '#e2e8f0', font: { size: 14, family: 'Inter', weight: '600' } } : undefined,
    },
  }

  return (
    <div style={{ height }}>
      <Bar data={data} options={options} />
    </div>
  )
}
