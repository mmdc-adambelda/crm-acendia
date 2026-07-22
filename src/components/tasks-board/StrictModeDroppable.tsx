'use client'

import * as React from 'react'
import { Droppable, type DroppableProps } from '@hello-pangea/dnd'

// Works around a known SSR/hydration timing issue with @hello-pangea/dnd
// (and its parent react-beautiful-dnd) in Next.js: the very first
// Droppable render can happen before the library's drag sensors are fully
// wired up, so nothing responds to drag gestures. Delaying the Droppable
// by one animation frame after mount reliably fixes it.
export function StrictModeDroppable({ children, ...props }: DroppableProps) {
  const [enabled, setEnabled] = React.useState(false)

  React.useEffect(() => {
    const frame = requestAnimationFrame(() => setEnabled(true))
    return () => {
      cancelAnimationFrame(frame)
      setEnabled(false)
    }
  }, [])

  if (!enabled) return null
  return <Droppable {...props}>{children}</Droppable>
}
