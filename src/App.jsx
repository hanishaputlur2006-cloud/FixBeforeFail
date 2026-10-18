import { Routes, Route, Link } from 'react-router-dom'
import LandingPage from './pages/landing/LandingPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import DashboardPage from './pages/app/DashboardPage.jsx'
import ReportDetailPage from './pages/app/ReportDetailPage.jsx'
import { DevRoleProvider } from './lib/devRole.jsx'

// Until real login exists (phase 3), the login page offers a demo preview instead.
const demoLink = (
  <Link to="/app" className="btn btn-primary">
    Preview the app with demo data
  </Link>
)

// Each <Route> maps a URL to a page component.
// Routes nested under /app share the AppLayout (sidebar and top bar).
export default function App() {
  return (
    <DevRoleProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PlaceholderPage title="Log in" phase={3} extraAction={demoLink} />} />
        <Route path="/register" element={<PlaceholderPage title="Create an account" phase={3} extraAction={demoLink} />} />
        <Route path="/report" element={<PlaceholderPage title="Report an issue" phase={4} />} />

        <Route path="/app" element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="new-report" element={<PlaceholderPage title="New report" phase={4} inApp />} />
          <Route path="map" element={<PlaceholderPage title="Map" phase={7} inApp />} />
          <Route path="analytics" element={<PlaceholderPage title="Analytics" phase={7} inApp />} />
          <Route path="*" element={<PlaceholderPage title="Page not found" notFound inApp />} />
        </Route>

        <Route path="*" element={<PlaceholderPage title="Page not found" notFound />} />
      </Routes>
    </DevRoleProvider>
  )
}
