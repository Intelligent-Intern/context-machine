// src/types/events.ts

export type EventScope = 'ui' | 'backend'

export interface WidgetEvent {
  name: string
  scope: EventScope
  payload?: any
  permission?: string
}
