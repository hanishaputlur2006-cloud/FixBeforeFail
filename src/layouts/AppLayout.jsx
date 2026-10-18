import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Bell,
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
import { useDevRole } from '../lib/devRole.jsx'
import { DEMO_USERS } from '../lib/sampleData.js'
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
  worker: [{ to: '/app', label: 'My assignments', icon: ClipboardList, end: true }],
}

// The frame around every signed-in page: sidebar, top bar and page content.
export default function AppLayout() {
  const { role, user, setRole } = useDevRole()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // Close the mobile menu whenever the page changes.
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

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
          <span className="avatar">{initials(user.name)}</span>
          <div className="sidebar-user-text">
            <span className="sidebar-user-name">{user.name}</span>
            <span className="sidebar-user-role">{user.roleLabel}</span>
          </div>
          <Link to="/" className="icon-btn icon-btn-dark" aria-label="Exit to home page" title="Exit to home page">
            <LogOut size={18} />
          </Link>
        </div>
      </aside>

      <div className="sidebar-overlay" onClick={() => setMenuOpen(false)} aria-hidden="true" />

      <div className="app-main">
        <header className="topbar">
          <button type="button" className="icon-btn topbar-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>

          {/* Development only: switch which role's dashboard you are previewing. */}
          <div className="dev-switcher">
            <span className="dev-tag mono">Demo</span>
            <div className="segmented" role="group" aria-label="Preview as role">
              {Object.values(DEMO_USERS).map((u) => (
                <button
                  key={u.role}
                  type="button"
                  className={u.role === role ? 'is-active' : undefined}
                  aria-pressed={u.role === role}
                  onClick={() => setRole(u.role)}
                >
                  {u.role === 'worker' ? 'Worker' : u.role === 'authority' ? 'Authority' : 'Citizen'}
                </button>
              ))}
            </div>
          </div>

          <button type="button" className="icon-btn topbar-bell" aria-label="Notifications" title="Notifications arrive in phase 7">
            <Bell size={18} />
          </button>
        </header>

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
