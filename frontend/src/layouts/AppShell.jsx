import { useContext } from 'react'
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

function AppShell({
  activeNav = '',
  children,
  hideTopbarTitle = false,
}) {
  const { signOut } = useContext(AuthContext)
  const navigate = useNavigate()

  async function handleLogout() {
    await signOut()
    navigate('/login', { replace: true })
  }

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
          {!hideTopbarTitle && (
            <div>
              <p>Good morning</p>
              <h2>{activeNav}</h2>
            </div>
          )}

          <div
            className="app-shell__topbar-actions"
            style={{ marginLeft: 'auto' }}
          >
            <input
              className="app-shell__search"
              placeholder="Search"
            />

            <button
              className="app-shell__avatar"
              onClick={handleLogout}
              aria-label="Logout"
            />
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