import { createContext, useState } from 'react'

export const BudgetContext = createContext()

function BudgetProvider({ children }) {
  const [budget, setBudget] = useState(null) // { amount, period } or null if not set

  return (
    <BudgetContext.Provider value={{ budget, setBudget }}>
      {children}
    </BudgetContext.Provider>
  )
}

export default BudgetProvider