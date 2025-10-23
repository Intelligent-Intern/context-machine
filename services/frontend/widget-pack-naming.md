# Widget Pack Naming Schema

## Übersicht

Das Context Machine System verwendet ein hierarchisches Naming-Schema für Widget Packs, das eine klare Struktur und Versionierung ermöglicht.

## Schema-Format

```
widget-pack/{module-name}/{type}/{project-uuid}/{version-nr}
```

### Komponenten

1. **`widget-pack`** - Fixer Prefix für alle Widget Packs
2. **`{module-name}`** - Name des Moduls (z.B. `core-ui`, `analytics`, `crm`)
3. **`{type}`** - Typ/Kategorie des Widget Packs (z.B. `navigation`, `forms`, `charts`)
4. **`{project-uuid}`** - UUID des Projekts aus der Datenbank
5. **`{version-nr}`** - Semantische Versionierung (z.B. `1.0.0`, `2.1.3`)

## Beispiele

### Navigation Widget Pack
```
widget-pack/core-ui/navigation/550e8400-e29b-41d4-a716-446655440000/1.0.0
```

### Forms Widget Pack
```
widget-pack/core-ui/forms/550e8400-e29b-41d4-a716-446655440000/1.2.0
```

### Analytics Charts Widget Pack
```
widget-pack/analytics/charts/123e4567-e89b-12d3-a456-426614174000/2.0.1
```

## Widget-Referenzen

Widgets werden referenziert mit:
```
{widget-pack-id}@{component-name}
```

### Beispiele:
```javascript
// Navigation Sidebar
'widget-pack/core-ui/navigation/550e8400-e29b-41d4-a716-446655440000/1.0.0@SidebarNav'

// Top Navigation Bar
'widget-pack/core-ui/navigation/550e8400-e29b-41d4-a716-446655440000/1.0.0@TopBar'

// Data Table
'widget-pack/core-ui/tables/550e8400-e29b-41d4-a716-446655440000/1.0.0@DataTable'
```

## Manifest-Struktur

```json
{
  "id": "widget-pack/core-ui/navigation/550e8400-e29b-41d4-a716-446655440000/1.0.0",
  "name": "Core Navigation Widget Pack",
  "version": "1.0.0",
  "description": "Enterprise-grade navigation components",
  "author": "Context Machine",
  "license": "MIT",
  "module": "core-ui",
  "type": "navigation",
  "projectId": "550e8400-e29b-41d4-a716-446655440000",
  "keywords": ["navigation", "sidebar", "menu", "enterprise"],
  "components": {
    "SidebarNav": {
      "path": "./widgets/SidebarNav.vue",
      "name": "Professional Sidebar Navigation",
      "description": "Enterprise sidebar navigation with hierarchical structure"
    },
    "TopBar": {
      "path": "./widgets/TopBar.vue", 
      "name": "Top Navigation Bar",
      "description": "Horizontal navigation bar with dropdowns"
    }
  }
}
```

## Verzeichnisstruktur

```
services/frontend/src/widget-packs/
├── core-ui-navigation-550e8400/     # Verzeichnisname (gekürzt)
│   ├── manifest.json                # Vollständige ID im Manifest
│   ├── widgets/
│   │   ├── SidebarNav.vue
│   │   └── TopBar.vue
│   └── theme/
│       ├── variables.css
│       └── themes.css
```

## Backend-Integration

Das Backend sendet Widget Pack Konfigurationen mit vollständigen IDs:

```json
{
  "widgetPacks": [
    {
      "id": "widget-pack/core-ui/navigation/550e8400-e29b-41d4-a716-446655440000/1.0.0",
      "components": {
        "SidebarNav": { "path": "./widgets/SidebarNav.vue" },
        "TopBar": { "path": "./widgets/TopBar.vue" }
      }
    }
  ]
}
```

## Paketmanager-Kompatibilität

Das Schema ist kompatibel mit Standard-Paketmanagern:

```bash
# NPM-Style Installation (zukünftig)
npm install widget-pack/core-ui/navigation/550e8400-e29b-41d4-a716-446655440000@1.0.0

# Yarn-Style Installation (zukünftig)
yarn add widget-pack/core-ui/navigation/550e8400-e29b-41d4-a716-446655440000@1.0.0
```

## Versionierung

- **Major Version** (1.x.x): Breaking Changes
- **Minor Version** (x.1.x): Neue Features, rückwärtskompatibel
- **Patch Version** (x.x.1): Bugfixes, rückwärtskompatibel

## Legacy-Support

Für Built-in Widgets wird weiterhin das einfache Format unterstützt:
```
login@LoginForm
dashboard@Welcome
```

Diese werden automatisch als System-Widgets behandelt und haben keine Projekt-Zuordnung.