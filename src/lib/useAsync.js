import { useCallback, useEffect, useRef, useState } from 'react'

// Runs an async function (like fetchReports) and tracks loading, error and data,
// so every page handles those three states the same way.
// reload() keeps the current data on screen until the new data arrives;
// changing the inputs (deps) starts fresh, so old data is never shown for a new item.
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const [attempt, setAttempt] = useState(0)
  const lastRun = useRef(null)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps)

  useEffect(() => {
    let cancelled = false
    const isReload = lastRun.current === run
    lastRun.current = run
    setState((s) => ({ data: isReload ? s.data : null, loading: true, error: null }))
    run()
      .then((data) => !cancelled && setState({ data, loading: false, error: null }))
      .catch((error) => !cancelled && setState((s) => ({ data: s.data, loading: false, error })))
    return () => {
      cancelled = true
    }
  }, [run, attempt])

  return { ...state, reload: () => setAttempt((n) => n + 1) }
}
