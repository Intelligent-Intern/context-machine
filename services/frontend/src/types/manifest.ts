// src/types/manifest.ts

export interface PageManifest {
  id: string
  route: string
  bars: Record<string, number>
  ports: Record<string, any>
  sizes?: Record<string, number>
}

export interface ModuleManifest {
  name: string
  version: string
  dependsOn?: string[]
  navigation?: any[]
  pages?: PageManifest[]
}

export interface WidgetDefinition {
  key: string
  component: string
  themeWidget?: string
  props?: Record<string, any>
  events?: { name: string; scope: 'ui' | 'backend'; permission?: string }[]
  classes?: Record<string, string>
}

export interface WidgetPackManifest {
  name: string
  version: string
  widgets: WidgetDefinition[]
  tokens?: string[]
}
