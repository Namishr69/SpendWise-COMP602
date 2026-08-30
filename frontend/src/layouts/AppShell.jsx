import { useContext, useState, useRef, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthProvider.jsx'
import './AppShell.css'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '📊', path: '/dashboard' },
  { label: 'Subscriptions', icon: '🗂️', path: '/subscriptions' },
  { label: 'Insights', icon: '📈', path: '/insights' },
  { label: 'Alerts', icon: '🔔', path: '/alerts' },
  { label: 'Settings', icon: '⚙️', path: '/settings' },
]

function AppShell({ activeNav = '', children }) {
  const { signOut } = useContext(AuthContext)
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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
                  <button onClick={handleLogout}>Logout</button>
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