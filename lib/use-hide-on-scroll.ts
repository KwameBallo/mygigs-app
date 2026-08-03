"use client"

import { useEffect, useState } from "react"

// Geeft `true` terwijl er in de hoofd-content gescrold wordt en `false` zodra
// het scrollen ~600 ms stilligt. Gebruikt om zwevende knoppen op mobiel tijdens
// het scrollen uit beeld te halen (ze staan anders in de weg).
export function useHideOnScroll(): boolean {
  const [scrolling, setScrolling] = useState(false)
  useEffect(() => {
    const el = document.querySelector("main")
    if (!el) return
    let timer: ReturnType<typeof setTimeout>
    const onScroll = () => {
      setScrolling(true)
      clearTimeout(timer)
      timer = setTimeout(() => setScrolling(false), 600)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      el.removeEventListener("scroll", onScroll)
      clearTimeout(timer)
    }
  }, [])
  return scrolling
}
