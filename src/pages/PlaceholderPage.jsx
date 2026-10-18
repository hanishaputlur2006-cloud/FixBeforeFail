import { Link } from 'react-router-dom'
import { ArrowLeft, Construction, FileQuestion } from 'lucide-react'
import SiteHeader from '../components/SiteHeader.jsx'
import './PlaceholderPage.css'

// Shown for routes that are planned but not built yet, and for unknown URLs.
export default function PlaceholderPage({ title, phase, notFound = false }) {
  const Icon = notFound ? FileQuestion : Construction

  return (
    <>
      <SiteHeader />
      <main className="placeholder">
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
          <Link to="/" className="btn btn-secondary">
            <ArrowLeft size={16} />
            Back to home
          </Link>
        </div>
      </main>
    </>
  )
}
