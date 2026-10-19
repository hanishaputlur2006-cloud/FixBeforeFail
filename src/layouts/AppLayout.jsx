import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ChartColumn,
  ClipboardList,
  FilePlus2,
  LayoutDashboard,
  LogOut,
  Map as MapIcon,
  Menu,
  X,
} from 'lucide-react'
import Logo from '../components/Logo.jsx'
import NotificationBell from '../components/NotificationBell.jsx'
import { ROLE_LABELS, useAuth } from '../lib/auth.jsx'
import { initials } from '../lib/format.js'
import './AppLayout.css'

// Sidebar links for each role.
const NAV = {
  citizen: [
    { to: '/app', label: 'My reports', icon: LayoutDashboard, end: true },
    { to: '/app/new-report', label: 'New report', icon: FilePlus2 },
  ],
  authority: [
    { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/app/map', label: 'Map', icon: MapIcon },
    { to: '/app/analytics', label: 'Analytics', icon: ChartColumn },
  ],
  worker: [
    { to: '/app', label: 'My assignments', icon: ClipboardList, end: true },
    { to: '/app/map', label: 'Map', icon: MapIcon },
  ],
}

// The frame around every signed-in page: sidebar, top bar and page content.
export default function AppLayout() {
  const { profile, signOut } = useAuth()
  const role = profile.role
  const name = profile.full_name || 'Unnamed user'
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // Close the mobile menu whenever the page changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className={`app ${menuOpen ? 'menu-open' : ''}`}>
      <aside className="sidebar" aria-label="Sidebar">
        <div className="sidebar-top">
          <Link to="/" aria-label="FixBeforeFail home">
            <Logo onDark size={26} />
          </Link>
          <button type="button" className="icon-btn sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV[role].map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="sidebar-link">
              <item.icon size={18} strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-user">
          <span className="avatar">{initials(name)}</span>
          <div className="sidebar-user-text">
            <span className="sidebar-user-name">{name}</span>
            <span className="sidebar-user-role">{ROLE_LABELS[role]}</span>
          </div>
          <button type="button" className="icon-btn icon-btn-dark" onClick={handleSignOut} aria-label="Log out" title="Log out">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <div className="app-main">
        <header className="topbar">
          <button type="button" className="icon-btn topbar-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>

          <span className="topbar-role">{ROLE_LABELS[role]} workspace</span>

          <NotificationBell userId={profile.id} />
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
