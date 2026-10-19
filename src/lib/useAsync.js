import { useCallback, useEffect, useState } from 'react'

// Runs an async function (like fetchReports) and tracks loading, error and data,
// so every page handles those three states the same way.
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  useEffect(() => {
    let cancelled = false
    setState((s) => ({ ...s, loading: true, error: null }))
    run()
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((error) => !cancelled && setState({ data: null, loading: false, error }))
    return () => {
      cancelled = true
    }
  }, [run, attempt])

  return { ...state, reload: () => setAttempt((n) => n + 1) }
}
