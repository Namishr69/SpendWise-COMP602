import { motion } from 'motion/react'

import { SPRING } from './motionPresets.js'
import './Button.css'

function Button({ children, variant = 'primary', type = 'button', fullWidth = false, ...rest }) {
  const classes = ['sw-button', `sw-button--${variant}`, fullWidth ? 'sw-button--full' : '']
    .filter(Boolean)
    .join(' ')

  const interactive = !rest.disabled

  return (
    <motion.button
      type={type}
      className={classes}
      whileHover={interactive ? { y: -1 } : undefined}
      whileTap={interactive ? { scale: 0.97, y: 0 } : undefined}
      transition={SPRING}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export default Button
