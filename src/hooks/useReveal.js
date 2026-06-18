import { useEffect } from 'react'

export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.rv')
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis') }),
      { threshold: 0.15 }
    )
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])
}
