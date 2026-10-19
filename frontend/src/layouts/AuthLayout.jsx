import { motion } from 'motion/react'

import { EASE_OUT } from '../components/ui/motionPresets.js'
import Logo from '../components/ui/Logo.jsx'
import './AuthLayout.css'

function AuthLayout({ children, variant = 'dark' }) {
  return (
    <div className={`auth-shell auth-shell--${variant}`}>
      <motion.div
        className="auth-shell__logo"
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, ease: EASE_OUT }}
      >
        <Logo className="auth-shell__logo-mark" height={28} />
        SpendWise
      </motion.div>
      <div className="auth-shell__panel">
        <motion.main
          className="auth-shell__content"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1, ease: EASE_OUT }}
        >
          {children}
        </motion.main>
      </div>
    </div>
  )
}

export default AuthLayout
