// DEVELOPMENT ONLY: lets you preview each role's dashboard before login exists.
// Phase 3 replaces this with the real signed-in user and their role from Supabase.

import { createContext, useContext, useState } from 'react'
import { DEMO_USERS } from './sampleData.js'

const STORAGE_KEY = 'fbf-dev-role'
const DevRoleContext = createContext(null)

function readSavedRole() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return DEMO_USERS[saved] ? saved : 'authority'
  } catch {
    return 'authority'
  }
}

export function DevRoleProvider({ children }) {
  const [role, setRoleState] = useState(readSavedRole)

  function setRole(next) {
    setRoleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage unavailable (private mode): the choice just won't be remembered.
    }
  }

  return (
    <DevRoleContext.Provider value={{ role, user: DEMO_USERS[role], setRole }}>
      {children}
    </DevRoleContext.Provider>
  )
}

export function useDevRole() {
  return useContext(DevRoleContext)
}
