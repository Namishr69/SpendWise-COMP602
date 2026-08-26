import AppShell from '../layouts/AppShell.jsx'
import Card from '../components/ui/Card.jsx'
import './DashboardPage.css'
import { formatCurrency } from '../utils/formatCurrency.js'

// Mock data — replace with real Firestore data once the backend endpoints exist
const STATS = [
  { label: 'Spent this month', amount: 342.80, currency: 'NZD' },
  { label: 'Active subs', value: '9' },
  { label: 'Due this week', amount: 74.98, currency: 'NZD' },
  { label: 'Alerts', value: '3' },
]

const UPCOMING_BILLS = [
  { name: 'Netflix', due: 'Due Aug', amount: 25.99, currency: 'NZD' },
  { name: 'Spotify', due: 'Due Aug', amount: 16.99, currency: 'NZD' },
  { name: 'iCloud', due: 'Due Aug', amount: 4.99, currency: 'NZD' },
  { name: 'Gym membership', due: 'Due Aug', amount: 49.00, currency: 'NZD' },
]

const ALERTS = ['2 trials ending soon', '1 unused subscription']

const CATEGORIES = ['Entertainment', 'Fitness', 'Cloud Storage']

function DashboardPage() {
  return (
    <AppShell activeNav="Dashboard">
      <div className="dashboard-stats">
        {STATS.map((stat) => (
          <Card key={stat.label} tone="forest" className="dashboard-stat">
            <p>{stat.label}</p>
            <h2 className="money">
              {stat.amount !== undefined
                ? formatCurrency(stat.amount, stat.currency)
                : stat.value}
            </h2>
          </Card>
        ))}
      </div>

      <div className="dashboard-grid">
        <Card>
          <h3>Upcoming bills</h3>
          <ul className="dashboard-list">
            {UPCOMING_BILLS.map((bill) => (
              <li key={bill.name} className="dashboard-list__item">
                <div>
                  <p className="dashboard-list__name">{bill.name}</p>
                  <p className="dashboard-list__due">{bill.due}</p>
                </div>
                <span className="money">
                  {formatCurrency(bill.amount, bill.currency)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <div className="dashboard-side">
          <Card>
            <h3>Alerts</h3>
            <div className="dashboard-chips">
              {ALERTS.map((alert) => (
                <span key={alert} className="dashboard-chip">
                  {alert}
                </span>
              ))}
            </div>
          </Card>

          <Card>
            <h3>By category</h3>
            <ul className="dashboard-categories">
              {CATEGORIES.map((category) => (
                <li key={category}>{category}</li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}

export default DashboardPage