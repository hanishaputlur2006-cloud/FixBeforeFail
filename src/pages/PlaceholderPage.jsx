import { Link } from 'react-router-dom'
import { ArrowLeft, Construction, FileQuestion } from 'lucide-react'
import SiteHeader from '../components/SiteHeader.jsx'
import './PlaceholderPage.css'

// Shown for routes that are planned but not built yet, and for unknown URLs.
// inApp: rendered inside the app layout, so no public header and the back link goes to the dashboard.
export default function PlaceholderPage({ title, phase, notFound = false, inApp = false, extraAction }) {
  const Icon = notFound ? FileQuestion : Construction

  const card = (
    <div className="placeholder-card">
      <span className="placeholder-icon">
        <Icon size={20} strokeWidth={1.75} />
      </span>
      <h1>{title}</h1>
      <p>
        {notFound
          ? 'The page you are looking for does not exist.'
          : `This page is planned for development phase ${phase} and is not available yet.`}
      </p>
      <div className="placeholder-actions">
        <Link to={inApp ? '/app' : '/'} className="btn btn-secondary">
          <ArrowLeft size={16} />
          {inApp ? 'Back to dashboard' : 'Back to home'}
        </Link>
        {extraAction}
      </div>
    </div>
  )

  if (inApp) return <div className="placeholder placeholder-in-app">{card}</div>

  return (
    <>
      <SiteHeader />
      <main className="placeholder">{card}</main>
    </>
  )
}
