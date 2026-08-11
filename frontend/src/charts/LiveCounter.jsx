import { useEffect, useRef, useState } from 'react'

/**
 * LiveCounter — animates a number from its previous value to the new value.
 */
export default function LiveCounter({ value = 0, suffix = '', prefix = '', className = '' }) {
  const [displayed, setDisplayed] = useState(0)
  const animRef = useRef(null)
  const prevRef = useRef(0)

  useEffect(() => {
    const target = Number(value) || 0
    const start = prevRef.current
    const duration = 600
    const startTime = performance.now()

    if (animRef.current) cancelAnimationFrame(animRef.current)

    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(start + (target - start) * eased)
      setDisplayed(current)
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        prevRef.current = target
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [value])

  return (
    <span className={className}>
      {prefix}{displayed.toLocaleString()}{suffix}
    </span>
  )
}
