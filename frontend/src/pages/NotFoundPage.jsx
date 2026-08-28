import AuthLayout from '../layouts/AuthLayout.jsx'
import Card from '../components/ui/Card.jsx'
import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <AuthLayout>
      <Card>
        <h2>404</h2>
        <p>Page not found</p>
        <Link to="/dashboard">Go to Dashboard</Link>
      </Card>
    </AuthLayout>
  )
}

export default NotFoundPage