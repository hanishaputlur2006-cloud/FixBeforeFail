import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import LandingPage from './pages/landing/LandingPage.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import { LoginPage, RegisterPage } from './pages/auth/AuthPages.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import DashboardPage from './pages/app/DashboardPage.jsx'
import ReportDetailPage from './pages/app/ReportDetailPage.jsx'
import NewReportPage from './pages/app/NewReportPage.jsx'
import RoleGate from './components/RoleGate.jsx'
import { LoadingState } from './components/StateViews.jsx'
import { AuthProvider } from './lib/auth.jsx'

// The map and analytics pages are larger (map library, charts), so they load only when opened.
const MapPage = lazy(() => import('./pages/app/MapPage.jsx'))
const AnalyticsPage = lazy(() => import('./pages/app/AnalyticsPage.jsx'))

function Lazy({ children }) {
  return <Suspense fallback={<LoadingState label="Loading page" />}>{children}</Suspense>
}

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
          <Route path="new-report" element={<NewReportPage />} />
          <Route
            path="map"
            element={
              <RoleGate roles={['authority', 'worker']}>
                <Lazy>
                  <MapPage />
                </Lazy>
              </RoleGate>
            }
          />
          <Route
            path="analytics"
            element={
              <RoleGate roles={['authority']}>
                <Lazy>
                  <AnalyticsPage />
                </Lazy>
              </RoleGate>
            }
          />
          <Route path="*" element={<PlaceholderPage title="Page not found" notFound inApp />} />
        </Route>

        <Route path="*" element={<PlaceholderPage title="Page not found" notFound />} />
      </Routes>
    </AuthProvider>
  )
}
