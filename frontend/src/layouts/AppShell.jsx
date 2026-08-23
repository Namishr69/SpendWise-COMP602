import './AppShell.css'
import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '🏠', path: '/dashboard' },
  { label: 'Subscriptions', icon: '🗂️', path: '/subscriptions' },
  { label: 'Insights', icon: '📊', path: '/insights' },
  { label: 'Alerts', icon: '🔔', path: '/alerts' },
  { label: 'Settings', icon: '⚙️', path: '/settings' },
]

function AppShell({ activeNav = '', children }) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__logo">🌱 SpendWise</div>
        <nav className="app-shell__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              className={({ isActive }) => `app-shell__nav-item ${isActive ? 'app-shell__nav-item--active' : ''}`}
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
            <button className="app-shell__add">+ Add</button>
            <div className="app-shell__avatar" />
          </div>
        </header>

        <main className="app-shell__content">{children}</main>
      </div>
    </div>
  )
}

export default AppShell