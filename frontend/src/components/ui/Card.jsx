import { motion } from 'motion/react'

import './Card.css'

// A motion.div so pages can pass Motion props (variants, whileHover, layout)
// straight through. Without them it renders like a plain div.
function Card({ children, tone = 'cream', className = '', ...rest }) {
  return (
    <motion.div className={`sw-card sw-card--${tone} ${className}`} {...rest}>
      {children}
    </motion.div>
  )
}

export default Card
