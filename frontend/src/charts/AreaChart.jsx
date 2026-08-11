import LineChart from './LineChart'

/**
 * AreaChart is a LineChart with fill=true — already default in our LineChart.
 * This component is kept as a named alias for clarity.
 */
export default function AreaChart({ labels = [], datasets = [], height = 280 }) {
  return <LineChart labels={labels} datasets={datasets} height={height} />
}
