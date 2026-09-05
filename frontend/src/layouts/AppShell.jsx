import { useContext, useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/authContext.js'
import './AppShell.css'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '📊', path: '/dashboard' },
  { label: 'Subscriptions', icon: '🗂️', path: '/subscriptions' },
  { label: 'Transactions', icon: '💳', path: '/transactions' },
  { label: 'Insights', icon: '📈', path: '/insights' },
  { label: 'Alerts', icon: '🔔', path: '/alerts' },
  { label: 'Settings', icon: '⚙️', path: '/settings' },
]

function AppShell({ activeNav = '', children }) {
  const { currentUser, signOut } = useContext(AuthContext)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const menuRef = useRef(null)

  async function handleLogout() {
    if (loggingOut) return
    setLoggingOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } finally {
      setLoggingOut(false)
    }
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__logo">🌱 SpendWise</div>

        <nav className="app-shell__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              className={({ isActive }) =>
                `app-shell__nav-item ${
                  isActive ? 'app-shell__nav-item--active' : ''
                }`
              }
              to={item.path}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-shell__main">
        <header className="app-shell__topbar">
          <div>
            <p>Good morning</p>
            <h2>{activeNav}</h2>
          </div>

          <div className="app-shell__topbar-actions">
            <input className="app-shell__search" placeholder="Search" />
            <div className="app-shell__avatar-wrap" ref={menuRef}>
              <button className="app-shell__avatar" onClick={() => setMenuOpen((v) => !v)} aria-label="Account menu" />
              {menuOpen && (
                <div className="app-shell__avatar-menu">
                  {currentUser?.email && (
                    <div className="app-shell__avatar-menu-email">{currentUser.email}</div>
                  )}
                  <button onClick={handleLogout} disabled={loggingOut}>
                    {loggingOut ? 'Logging out...' : 'Logout'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="app-shell__content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppShell