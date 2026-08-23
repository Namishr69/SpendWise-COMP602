import { Link } from 'react-router-dom'
import './AppShell.css'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '🏠', to: '/dashboard' },
  { label: 'Subscriptions', icon: '🗂️', to: '/subscriptions' },
  { label: 'Insights', icon: '📊', to: '/insights' },
  { label: 'Alerts', icon: '🔔', to: '/alerts' },
  { label: 'Settings', icon: '⚙️', to: '/settings' },
]

function AppShell({ activeNav = 'Dashboard', children }) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__logo">🌱 SpendWise</div>
        <nav className="app-shell__nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={`app-shell__nav-item ${item.label === activeNav ? 'app-shell__nav-item--active' : ''}`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
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