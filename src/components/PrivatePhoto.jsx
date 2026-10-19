import { getPhotoUrl } from '../lib/reportsApi.js'
import { useAsync } from '../lib/useAsync.js'

// Shows a photo from the private bucket through a temporary signed link.
// Clicking opens the full-size image in a new tab.
export default function PrivatePhoto({ path, alt, className = '' }) {
  const { data: url, loading, error } = useAsync(() => getPhotoUrl(path), [path])

  if (loading) return <div className={`photo-placeholder ${className}`} aria-label="Loading photo" />
  if (error) return <p className="field-error">The photo could not be loaded.</p>

  return (
    <a href={url} target="_blank" rel="noreferrer" className={`private-photo ${className}`}>
      <img src={url} alt={alt} />
    </a>
  )
}
