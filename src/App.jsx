import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/landing/LandingPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'

// Each <Route> maps a URL to a page component.
// Pages that are not built yet show an honest placeholder instead of a broken link.
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PlaceholderPage title="Log in" phase={3} />} />
      <Route path="/register" element={<PlaceholderPage title="Create an account" phase={3} />} />
      <Route path="/report" element={<PlaceholderPage title="Report an issue" phase={4} />} />
      <Route path="*" element={<PlaceholderPage title="Page not found" notFound />} />
    </Routes>
  )
}
