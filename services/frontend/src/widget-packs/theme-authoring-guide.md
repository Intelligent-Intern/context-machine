# Widget Pack Theme Authoring Guide

This guide explains how to create and maintain themes for widget packs in the Context Machine system.

## Table of Contents

1. [Theme Folder Structure](#theme-folder-structure)
2. [Theme Variable Definition](#theme-variable-definition)
3. [Naming Conventions](#naming-conventions)
4. [Variable Types](#variable-types)
5. [Theme Variants](#theme-variants)
6. [Best Practices](#best-practices)
7. [Examples](#examples)
8. [Validation](#validation)

## Theme Folder Structure

Each widget pack should include a `theme/` folder with the following structure:

```
widget-packs/
  your-pack/
    theme/
      variables.json      # Theme variable definitions (required)
      variables.css       # CSS custom properties (optional)
      defaults.css        # Default styles (optional)
      variants/           # Theme variants (optional)
        dark.css
        compact.css
        high-contrast.css
      preview.png         # Theme preview image (optional)
      README.md          # Theme documentation (optional)
      CHANGELOG.md       # Version history (optional)
    widgets/
      YourWidget.vue
    manifest.json
```

### Required Files

- **`variables.json`**: Main theme definition file containing structured variable definitions
- At least one of: `variables.css` or CSS variables in `variables.json`

### Optional Files

- **`variables.css`**: CSS custom properties for direct CSS usage
- **`defaults.css`**: Default styles that use the theme variables
- **`variants/`**: Directory containing theme variant files
- **`preview.png`**: Preview image (recommended size: 400x300px)
- **`README.md`**: Documentation for theme authors and users
- **`CHANGELOG.md`**: Version history and changes

## Theme Variable Definition

### variables.json Structure

```json
{
  "version": "1.0.0",
  "name": "Your Widget Pack Theme",
  "description": "Theme variables for your widget pack",
  "author": "Your Name",
  "license": "MIT",
  "categories": {
    "colors": {
      "name": "Colors",
      "description": "Color palette and color-related variables",
      "icon": "🎨",
      "order": 1,
      "variables": {
        "primary": {
          "name": "primary",
          "type": "color",
          "default": "#3b82f6",
          "description": "Primary brand color",
          "category": "colors",
          "examples": ["#3b82f6", "#ef4444", "#10b981"]
        },
        "background": {
          "name": "background",
          "type": "color",
          "default": "#ffffff",
          "description": "Main background color",
          "category": "colors",
          "examples": ["#ffffff", "#f8fafc", "#1f2937"]
        }
      }
    },
    "typography": {
      "name": "Typography",
      "description": "Font and text-related properties",
      "icon": "📝",
      "order": 2,
      "variables": {
        "font-size": {
          "name": "font-size",
          "type": "size",
          "default": "14px",
          "description": "Base font size",
          "category": "typography",
          "min": 10,
          "max": 24,
          "unit": "px",
          "examples": ["14px", "16px", "1rem"]
        }
      }
    }
  }
}
```

### Variable Properties

#### Required Properties

- **`name`**: Variable name (kebab-case, no `--` prefix)
- **`type`**: Variable type (see [Variable Types](#variable-types))
- **`default`**: Default value
- **`description`**: Human-readable description
- **`category`**: Category name (must match category key)

#### Optional Properties

- **`min`**: Minimum value (for numeric types)
- **`max`**: Maximum value (for numeric types)
- **`step`**: Step increment (for numeric types)
- **`unit`**: Expected unit (px, rem, em, %, etc.)
- **`options`**: Array of allowed values
- **`required`**: Whether variable is required (default: false)
- **`deprecated`**: Whether variable is deprecated (default: false)
- **`since`**: Version when variable was introduced
- **`examples`**: Array of example values

## Naming Conventions

### Variable Names

- Use **kebab-case**: `primary-color`, `font-size`, `border-radius`
- Start with lowercase letter: `primary` ✅, `Primary` ❌
- Use descriptive names: `primary-color` ✅, `color1` ❌
- Avoid abbreviations: `background-color` ✅, `bg-col` ❌

### Category Names

- Use **lowercase**: `colors`, `typography`, `spacing`
- Single word preferred: `colors` ✅, `color-palette` ❌
- Standard categories: `colors`, `typography`, `spacing`, `borders`, `shadows`, `transitions`

### CSS Custom Properties

Variables are automatically converted to CSS custom properties with `--` prefix:

```json
"primary": { "name": "primary", "default": "#3b82f6" }
```

Becomes: `--primary: #3b82f6;`

### Reserved Prefixes

Avoid these reserved prefixes:
- `system-*`
- `internal-*`
- `private-*`
- `temp-*`

## Variable Types

### color

For color values including hex, rgb, hsl, and named colors.

```json
{
  "name": "primary-color",
  "type": "color",
  "default": "#3b82f6",
  "description": "Primary brand color",
  "examples": ["#3b82f6", "rgb(59, 130, 246)", "hsl(217, 91%, 60%)"]
}
```

**Valid formats:**
- Hex: `#3b82f6`, `#fff`
- RGB: `rgb(59, 130, 246)`, `rgba(59, 130, 246, 0.5)`
- HSL: `hsl(217, 91%, 60%)`, `hsla(217, 91%, 60%, 0.5)`
- Named: `blue`, `transparent`, `currentColor`
- CSS variables: `var(--other-color)`

### size

For dimensions, lengths, and sizes.

```json
{
  "name": "font-size",
  "type": "size",
  "default": "14px",
  "description": "Base font size",
  "min": 10,
  "max": 24,
  "unit": "px",
  "examples": ["14px", "1rem", "0.875em"]
}
```

**Valid units:** `px`, `rem`, `em`, `%`, `vh`, `vw`, `pt`, `pc`, `in`, `cm`, `mm`, `ex`, `ch`, `vmin`, `vmax`, `fr`

### font

For font families, weights, and font-related properties.

```json
{
  "name": "font-family",
  "type": "font",
  "default": "Inter, system-ui, sans-serif",
  "description": "Primary font family",
  "examples": [
    "Inter, system-ui, sans-serif",
    "Georgia, serif",
    "Monaco, monospace"
  ]
}
```

### spacing

For margins, padding, gaps, and layout spacing.

```json
{
  "name": "spacing-md",
  "type": "spacing",
  "default": "16px",
  "description": "Medium spacing unit",
  "examples": ["16px", "1rem", "8px 16px", "1rem 1.5rem 1rem 1.5rem"]
}
```

### shadow

For box shadows and drop shadows.

```json
{
  "name": "shadow-md",
  "type": "shadow",
  "default": "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  "description": "Medium shadow for cards",
  "examples": [
    "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    "0 2px 8px rgba(0, 0, 0, 0.15)",
    "none"
  ]
}
```

### border

For border widths, styles, and border radius.

```json
{
  "name": "border-radius",
  "type": "border",
  "default": "6px",
  "description": "Standard border radius",
  "examples": ["6px", "0.375rem", "50%", "0"]
}
```

### transition

For animation durations, easing functions, and transitions.

```json
{
  "name": "transition-normal",
  "type": "transition",
  "default": "250ms ease-in-out",
  "description": "Normal transition for most animations",
  "examples": [
    "250ms ease-in-out",
    "all 0.3s ease",
    "opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)"
  ]
}
```

### opacity

For opacity and transparency values.

```json
{
  "name": "opacity-disabled",
  "type": "opacity",
  "default": "0.5",
  "description": "Opacity for disabled elements",
  "min": 0,
  "max": 1,
  "step": 0.1,
  "examples": ["0.5", "0.7", "0.3"]
}
```

### z-index

For stacking order and layering.

```json
{
  "name": "z-modal",
  "type": "z-index",
  "default": "1000",
  "description": "Z-index for modal overlays",
  "min": 0,
  "examples": ["1000", "999", "1001"]
}
```

## Theme Variants

Theme variants allow you to provide alternative versions of your theme (e.g., dark mode, compact mode).

### Creating Variants

1. Create a `variants/` directory in your theme folder
2. Add CSS files for each variant: `dark.css`, `compact.css`, etc.
3. Optionally add JSON override files: `dark.json`, `compact.json`

### Variant CSS Example

```css
/* variants/dark.css */
:root {
  --primary: #60a5fa;
  --background: #1f2937;
  --surface: #374151;
  --text: #f9fafb;
  --text-secondary: #d1d5db;
  --border: #4b5563;
}
```

### Variant JSON Example

```json
{
  "name": "Dark Theme",
  "description": "Dark mode variant with inverted colors",
  "overrides": {
    "primary": "#60a5fa",
    "background": "#1f2937",
    "surface": "#374151",
    "text": "#f9fafb",
    "text-secondary": "#d1d5db",
    "border": "#4b5563"
  },
  "conditions": {
    "mediaQuery": "(prefers-color-scheme: dark)",
    "userPreference": "dark"
  }
}
```

## Best Practices

### 1. Use Semantic Names

```json
// ✅ Good - semantic and descriptive
"primary-color": "#3b82f6"
"text-color": "#1f2937"
"success-color": "#10b981"

// ❌ Bad - generic and unclear
"color1": "#3b82f6"
"blue": "#1f2937"
"green": "#10b981"
```

### 2. Provide Meaningful Descriptions

```json
// ✅ Good - explains purpose and usage
{
  "name": "primary-color",
  "description": "Primary brand color used for buttons, links, and key UI elements"
}

// ❌ Bad - too generic
{
  "name": "primary-color",
  "description": "A color"
}
```

### 3. Include Examples

```json
{
  "name": "border-radius",
  "type": "border",
  "default": "6px",
  "examples": ["6px", "8px", "4px", "0.375rem", "50%"]
}
```

### 4. Set Appropriate Constraints

```json
{
  "name": "font-size",
  "type": "size",
  "default": "14px",
  "min": 10,
  "max": 24,
  "unit": "px"
}
```

### 5. Group Related Variables

```json
{
  "categories": {
    "colors": {
      "variables": {
        "primary": { /* ... */ },
        "secondary": { /* ... */ },
        "accent": { /* ... */ }
      }
    }
  }
}
```

### 6. Use Consistent Units

```json
// ✅ Good - consistent rem units for spacing
"spacing-sm": "0.5rem"
"spacing-md": "1rem"
"spacing-lg": "1.5rem"

// ❌ Bad - mixed units
"spacing-sm": "8px"
"spacing-md": "1rem"
"spacing-lg": "24px"
```

### 7. Provide Fallbacks

```css
/* Use CSS variables with fallbacks */
.my-component {
  color: var(--text-color, #1f2937);
  background: var(--background-color, #ffffff);
}
```

## Examples

### Minimal Theme

```json
{
  "version": "1.0.0",
  "name": "Simple Button Theme",
  "categories": {
    "colors": {
      "name": "Colors",
      "description": "Button colors",
      "variables": {
        "button-bg": {
          "name": "button-bg",
          "type": "color",
          "default": "#3b82f6",
          "description": "Button background color",
          "category": "colors"
        },
        "button-text": {
          "name": "button-text",
          "type": "color",
          "default": "#ffffff",
          "description": "Button text color",
          "category": "colors"
        }
      }
    }
  }
}
```

### Complete Theme

```json
{
  "version": "1.0.0",
  "name": "Navigation Widget Theme",
  "description": "Complete theme for navigation widgets",
  "author": "Context Machine Team",
  "license": "MIT",
  "categories": {
    "colors": {
      "name": "Colors",
      "description": "Navigation color palette",
      "icon": "🎨",
      "order": 1,
      "variables": {
        "nav-bg": {
          "name": "nav-bg",
          "type": "color",
          "default": "#ffffff",
          "description": "Navigation background color",
          "category": "colors",
          "examples": ["#ffffff", "#f8fafc", "#1f2937"]
        },
        "nav-text": {
          "name": "nav-text",
          "type": "color",
          "default": "#1f2937",
          "description": "Navigation text color",
          "category": "colors",
          "examples": ["#1f2937", "#374151", "#f9fafb"]
        },
        "nav-active": {
          "name": "nav-active",
          "type": "color",
          "default": "#3b82f6",
          "description": "Active navigation item color",
          "category": "colors",
          "examples": ["#3b82f6", "#ef4444", "#10b981"]
        }
      }
    },
    "spacing": {
      "name": "Spacing",
      "description": "Navigation spacing and layout",
      "icon": "📏",
      "order": 2,
      "variables": {
        "nav-padding": {
          "name": "nav-padding",
          "type": "spacing",
          "default": "16px",
          "description": "Navigation container padding",
          "category": "spacing",
          "min": 8,
          "max": 32,
          "unit": "px",
          "examples": ["16px", "1rem", "12px 16px"]
        },
        "nav-item-height": {
          "name": "nav-item-height",
          "type": "size",
          "default": "40px",
          "description": "Navigation item height",
          "category": "spacing",
          "min": 32,
          "max": 56,
          "unit": "px",
          "examples": ["40px", "2.5rem", "44px"]
        }
      }
    }
  },
  "variants": {
    "dark": {
      "name": "Dark Navigation",
      "description": "Dark theme variant for navigation",
      "overrides": {
        "nav-bg": "#1f2937",
        "nav-text": "#f9fafb",
        "nav-active": "#60a5fa"
      }
    }
  }
}
```

## Validation

The theme system automatically validates your theme definitions. Common validation errors:

### Invalid Variable Names

```json
// ❌ Invalid - starts with uppercase
"Primary-color": "#3b82f6"

// ❌ Invalid - contains spaces
"primary color": "#3b82f6"

// ✅ Valid - kebab-case
"primary-color": "#3b82f6"
```

### Invalid Types

```json
// ❌ Invalid - unknown type
{
  "type": "custom-type",
  "default": "value"
}

// ✅ Valid - standard type
{
  "type": "color",
  "default": "#3b82f6"
}
```

### Missing Required Fields

```json
// ❌ Invalid - missing required fields
{
  "name": "primary"
}

// ✅ Valid - all required fields
{
  "name": "primary",
  "type": "color",
  "default": "#3b82f6",
  "description": "Primary color",
  "category": "colors"
}
```

### Invalid Values

```json
// ❌ Invalid - bad color format
{
  "type": "color",
  "default": "not-a-color"
}

// ❌ Invalid - size without unit
{
  "type": "size",
  "default": "16"
}

// ✅ Valid - proper formats
{
  "type": "color",
  "default": "#3b82f6"
}
{
  "type": "size",
  "default": "16px"
}
```

## Testing Your Theme

1. **Validation**: The system automatically validates your theme schema
2. **Preview**: Use the theme editor to preview your variables
3. **Variants**: Test all theme variants in different conditions
4. **Accessibility**: Ensure sufficient color contrast ratios
5. **Responsiveness**: Test on different screen sizes

## Migration Guide

When updating existing themes:

1. **Backup**: Always backup your existing theme files
2. **Validate**: Use the validation tools to check compatibility
3. **Test**: Thoroughly test all theme variants
4. **Document**: Update CHANGELOG.md with changes
5. **Version**: Increment version number appropriately

## Support

For questions or issues with theme authoring:

1. Check the validation errors in the theme editor
2. Review this guide and examples
3. Check the theme system documentation
4. Contact the development team

---

*This guide is part of the Context Machine theme system. For technical implementation details, see the theme system documentation.*