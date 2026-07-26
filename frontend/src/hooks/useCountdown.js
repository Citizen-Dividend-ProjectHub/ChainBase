import { useEffect, useState } from 'react'

export function useCountdown(targetDate) {
  const [text, setText] = useState('')

  useEffect(() => {
    if (!targetDate) {
      setText('')
      return
    }
    const target = new Date(targetDate)

    function tick() {
      let ms = target - new Date()
      if (ms < 0) ms = 0
      const d = Math.floor(ms / 86400000)
      const h = Math.floor((ms % 86400000) / 3600000)
      const m = Math.floor((ms % 3600000) / 60000)
      const s = Math.floor((ms % 60000) / 1000)
      setText(`${d}d ${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetDate])

  return text
}
