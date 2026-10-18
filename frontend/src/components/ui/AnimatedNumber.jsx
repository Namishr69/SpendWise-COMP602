import { useLayoutEffect, useRef } from 'react'
import { animate, useReducedMotion } from 'motion/react'

import { EASE_OUT } from './motionPresets.js'

// Counts up to `value`, writing straight to the DOM so React does not
// re-render every frame. `format` turns the in-between number into text.
function AnimatedNumber({ value, format = Math.round }) {
  const ref = useRef(null)
  const shown = useRef(0)
  const reduceMotion = useReducedMotion()

  useLayoutEffect(() => {
    const node = ref.current
    const target = Number(value) || 0

    if (reduceMotion) {
      shown.current = target
      node.textContent = format(target)
      return undefined
    }

    const controls = animate(shown.current, target, {
      duration: 0.9,
      ease: EASE_OUT,
      onUpdate(latest) {
        shown.current = latest
        node.textContent = format(latest)
      },
    })

    return () => controls.stop()
  }, [value, format, reduceMotion])

  return <span ref={ref} />
}

export default AnimatedNumber
