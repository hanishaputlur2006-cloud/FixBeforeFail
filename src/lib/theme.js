import { useEffect, useState } from 'react'

// Theme preference: 'system' (follow the device), 'light' or 'dark'.
// The resolved theme is written to <html data-theme="..."> for the CSS in tokens.css.
// index.html applies the saved theme before the page draws, so there is no flash.

const STORAGE_KEY = 'fbf-theme'
const media = window.matchMedia('(prefers-color-scheme: dark)')

function readPreference() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  } catch {
    return 'system'
  }
}

function apply(preference) {
  const dark = preference === 'dark' || (preference === 'system' && media.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
}

export function useTheme() {
  const [preference, setPreference] = useState(readPreference)

  useEffect(() => {
    apply(preference)
    if (preference !== 'system') return undefined
    const onChange = () => apply('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [preference])

  function choose(next) {
    setPreference(next)
    try {
      if (next === 'system') localStorage.removeItem(STORAGE_KEY)
      else localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable: the choice lasts until the page is closed.
    }
  }

  return { preference, choose }
}
