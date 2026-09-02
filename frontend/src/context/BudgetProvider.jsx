import { createContext, useState } from 'react'

export const BudgetContext = createContext()

const STORAGE_KEY = 'spendwise:budget'

function loadStoredBudget() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function BudgetProvider({ children }) {
  const [budget, setBudgetState] = useState(loadStoredBudget)

  function setBudget(newBudget) {
    setBudgetState(newBudget)
    try {
      if (newBudget) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newBudget))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // ignore storage errors (e.g. private browsing blocking access)
    }
  }

  return (
    <BudgetContext.Provider value={{ budget, setBudget }}>
      {children}
    </BudgetContext.Provider>
  )
}

export default BudgetProvider