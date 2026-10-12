import { Link } from 'react-router-dom'

import AuthLayout from '../layouts/AuthLayout.jsx'
import Card from '../components/ui/Card.jsx'
import {
  useTranslations,
} from '../hooks/useTranslations.js'

const NOT_FOUND_TEXT = [
  'Page not found',
  'Go to Dashboard',
]

function NotFoundPage() {
  const [
    pageNotFoundText,
    goToDashboardText,
  ] = useTranslations(
    NOT_FOUND_TEXT,
  )

  return (
    <AuthLayout>
      <Card>
        <h2>404</h2>

        <p>
          {pageNotFoundText}
        </p>

        <Link to="/dashboard">
          {goToDashboardText}
        </Link>
      </Card>
    </AuthLayout>
  )
}

export default NotFoundPage