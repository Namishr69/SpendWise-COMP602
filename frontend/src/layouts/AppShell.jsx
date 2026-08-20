import './AppShell.css'

const NAV_ITEMS = [
  { label: 'Dashboard', icon: '🏠' },
  { label: 'Subscriptions', icon: '🗂️' },
  { label: 'Insights', icon: '📊' },
  { label: 'Alerts', icon: '🔔' },
  { label: 'Settings', icon: '⚙️' },
]

function AppShell({ activeNav = 'Dashboard', children }) {
  return (
    <div className="app-shell">
      <aside className="app-shell__sidebar">
        <div className="app-shell__logo">🌱 SpendWise</div>
        <nav className="app-shell__nav">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.label}
              className={`app-shell__nav-item ${item.label === activeNav ? 'app-shell__nav-item--active' : ''}`}
              href="#"
            >
              <span>{item.icon}</span>
              {item.label}
            </a>
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