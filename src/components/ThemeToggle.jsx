import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '../lib/theme.js'

const ORDER = ['system', 'light', 'dark']
const META = {
  system: { icon: Monitor, label: 'Theme: device setting' },
  light: { icon: Sun, label: 'Theme: light' },
  dark: { icon: Moon, label: 'Theme: dark' },
}

// Cycles through device setting, light and dark.
export default function ThemeToggle({ onDark = false }) {
  const { preference, choose } = useTheme()
  const { icon: Icon, label } = META[preference]
  const next = ORDER[(ORDER.indexOf(preference) + 1) % ORDER.length]

  return (
    <button
      type="button"
      className={`icon-btn theme-toggle ${onDark ? 'icon-btn-dark' : ''}`}
      onClick={() => choose(next)}
      aria-label={`${label}. Switch to ${META[next].label.replace('Theme: ', '')}`}
      title={label}
    >
      <Icon size={18} />
    </button>
  )
}
