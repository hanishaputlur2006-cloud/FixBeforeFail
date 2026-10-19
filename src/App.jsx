import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/landing/LandingPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import { LoginPage, RegisterPage } from './pages/auth/AuthPages.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import DashboardPage from './pages/app/DashboardPage.jsx'
import ReportDetailPage from './pages/app/ReportDetailPage.jsx'
import { AuthProvider } from './lib/auth.jsx'

// Each <Route> maps a URL to a page component.
// Everything under /app requires a signed-in user and shares the AppLayout.
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* "Report an issue" buttons: sends visitors to log in first, then to the form. */}
        <Route path="/report" element={<Navigate to="/app/new-report" replace />} />

        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppLayout />
            </RequireAuth>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="new-report" element={<PlaceholderPage title="New report" phase={4} inApp />} />
          <Route path="map" element={<PlaceholderPage title="Map" phase={7} inApp />} />
          <Route path="analytics" element={<PlaceholderPage title="Analytics" phase={7} inApp />} />
          <Route path="*" element={<PlaceholderPage title="Page not found" notFound inApp />} />
        </Route>

        <Route path="*" element={<PlaceholderPage title="Page not found" notFound />} />
      </Routes>
    </AuthProvider>
  )
}
