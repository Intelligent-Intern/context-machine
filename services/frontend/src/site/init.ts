// src/site/init.ts
// Fallback configuration when backend is unavailable

/**
 * Default fallback configuration - hardcoded in init.ts
 * Used when backend config is not available
 */
export const DEFAULT_FALLBACK_CONFIG = {
  lang: 'de',
  theme: 'fallback',
  routes: [
    {
      route: '/',
      name: 'Home',
      layout: {
        bars: { t: 0, b: 0, l: 0, r: 0 }, // All bars hidden
        ports: {
          m: ['auth@LoginForm'] // Only auth widget in main
        }
      }
    }
  ],
  styles: {
    // Complete responsive auth theme
    '.auth-container': {
      'position': 'relative',
      'display': 'flex',
      'justify-content': 'center',
      'align-items': 'center',
      'min-height': '100vh',
      'padding': '1rem',
      'background': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      'overflow': 'hidden'
    },

    // Background orbs
    '.auth-bg-orb': {
      'position': 'absolute',
      'border-radius': '50%',
      'background': 'rgba(255, 255, 255, 0.1)',
      'backdrop-filter': 'blur(10px)',
      'animation': 'float 6s ease-in-out infinite'
    },
    '.auth-bg-orb-1': {
      'width': '300px',
      'height': '300px',
      'top': '-150px',
      'left': '-150px',
      'animation-delay': '0s'
    },
    '.auth-bg-orb-2': {
      'width': '200px',
      'height': '200px',
      'bottom': '-100px',
      'right': '-100px',
      'animation-delay': '2s'
    },
    '.auth-bg-orb-3': {
      'width': '150px',
      'height': '150px',
      'top': '20%',
      'right': '10%',
      'animation-delay': '4s'
    },

    // Main card - responsive
    '.auth-card': {
      'position': 'relative',
      'z-index': '10',
      'background': 'rgba(255, 255, 255, 0.95)',
      'backdrop-filter': 'blur(20px)',
      'border-radius': '20px',
      'padding': '2.5rem',
      'box-shadow': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      'width': '100%',
      'max-width': '420px',
      'border': '1px solid rgba(255, 255, 255, 0.2)'
    },

    // Brand section
    '.auth-brand': {
      'text-align': 'center',
      'margin-bottom': '2rem'
    },
    '.auth-logo': {
      'width': '60px',
      'height': '60px',
      'margin': '0 auto 1rem',
      'background': 'linear-gradient(135deg, #667eea, #764ba2)',
      'border-radius': '16px',
      'display': 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'color': 'white'
    },
    '.auth-logo svg': {
      'width': '32px',
      'height': '32px'
    },
    '.auth-title': {
      'font-size': '1.875rem',
      'font-weight': '700',
      'color': '#1f2937',
      'margin': '0 0 0.5rem 0'
    },
    '.auth-subtitle': {
      'color': '#6b7280',
      'font-size': '1rem',
      'margin': '0'
    },

    // Form styling
    '.auth-form': {
      'display': 'flex',
      'flex-direction': 'column',
      'gap': '1.5rem'
    },
    '.auth-form-group': {
      'display': 'flex',
      'flex-direction': 'column',
      'gap': '0.5rem'
    },
    '.auth-label': {
      'font-weight': '600',
      'color': '#374151',
      'font-size': '0.875rem'
    },
    '.auth-input-container': {
      'position': 'relative',
      'display': 'flex',
      'align-items': 'center'
    },
    '.auth-input-icon': {
      'position': 'absolute',
      'left': '1rem',
      'color': '#9ca3af',
      'z-index': '10'
    },
    '.auth-input-icon svg': {
      'width': '20px',
      'height': '20px'
    },
    '.auth-input': {
      'width': '100%',
      'padding': '0.875rem 1rem 0.875rem 3rem',
      'border': '2px solid #e5e7eb',
      'border-radius': '12px',
      'font-size': '1rem',
      'transition': 'all 0.2s',
      'background': 'white'
    },
    '.auth-input:focus': {
      'outline': 'none',
      'border-color': '#667eea',
      'box-shadow': '0 0 0 3px rgba(102, 126, 234, 0.1)'
    },
    '.auth-input:disabled': {
      'background': '#f9fafb',
      'cursor': 'not-allowed'
    },

    // Options row
    '.auth-options': {
      'display': 'flex',
      'justify-content': 'space-between',
      'align-items': 'center',
      'margin': '-0.5rem 0'
    },
    '.auth-checkbox-container': {
      'display': 'flex',
      'align-items': 'center',
      'gap': '0.5rem',
      'cursor': 'pointer'
    },
    '.auth-checkbox': {
      'width': '16px',
      'height': '16px',
      'accent-color': '#667eea'
    },
    '.auth-checkbox-label': {
      'font-size': '0.875rem',
      'color': '#6b7280'
    },
    '.auth-forgot-link': {
      'background': 'none',
      'border': 'none',
      'color': '#667eea',
      'font-size': '0.875rem',
      'cursor': 'pointer',
      'text-decoration': 'none',
      'padding': '0'
    },
    '.auth-forgot-link:hover': {
      'text-decoration': 'underline'
    },

    // Submit button
    '.auth-submit': {
      'width': '100%',
      'padding': '1rem',
      'background': 'linear-gradient(135deg, #667eea, #764ba2)',
      'color': 'white',
      'border': 'none',
      'border-radius': '12px',
      'font-size': '1rem',
      'font-weight': '600',
      'cursor': 'pointer',
      'transition': 'all 0.2s',
      'display': 'flex',
      'align-items': 'center',
      'justify-content': 'center',
      'gap': '0.5rem'
    },
    '.auth-submit:hover:not(:disabled)': {
      'transform': 'translateY(-1px)',
      'box-shadow': '0 10px 25px -5px rgba(102, 126, 234, 0.4)'
    },
    '.auth-submit:disabled': {
      'opacity': '0.6',
      'cursor': 'not-allowed',
      'transform': 'none'
    },
    '.auth-loading-spinner': {
      'width': '20px',
      'height': '20px',
      'border': '2px solid rgba(255, 255, 255, 0.3)',
      'border-top': '2px solid white',
      'border-radius': '50%',
      'animation': 'spin 1s linear infinite'
    },

    // Messages
    '.auth-error': {
      'color': '#dc2626',
      'font-size': '0.875rem',
      'margin-top': '0.25rem'
    },
    '.auth-error-banner': {
      'background': '#fef2f2',
      'border': '1px solid #fecaca',
      'color': '#dc2626',
      'padding': '1rem',
      'border-radius': '12px',
      'display': 'flex',
      'align-items': 'flex-start',
      'gap': '0.75rem'
    },
    '.auth-error-icon svg': {
      'width': '20px',
      'height': '20px',
      'flex-shrink': '0',
      'margin-top': '2px'
    },
    '.auth-error-content h4': {
      'margin': '0 0 0.25rem 0',
      'font-size': '0.875rem',
      'font-weight': '600'
    },
    '.auth-error-content p': {
      'margin': '0',
      'font-size': '0.875rem'
    },
    '.auth-success-banner': {
      'background': '#f0fdf4',
      'border': '1px solid #bbf7d0',
      'color': '#166534',
      'padding': '1rem',
      'border-radius': '12px',
      'display': 'flex',
      'align-items': 'flex-start',
      'gap': '0.75rem'
    },
    '.auth-success-icon svg': {
      'width': '20px',
      'height': '20px',
      'flex-shrink': '0',
      'margin-top': '2px'
    },
    '.auth-success-content h4': {
      'margin': '0 0 0.25rem 0',
      'font-size': '0.875rem',
      'font-weight': '600'
    },
    '.auth-success-content p': {
      'margin': '0',
      'font-size': '0.875rem'
    },

    // Footer
    '.auth-footer': {
      'text-align': 'center',
      'margin-top': '2rem',
      'padding-top': '1.5rem',
      'border-top': '1px solid #e5e7eb'
    },
    '.auth-footer p': {
      'margin': '0',
      'font-size': '0.875rem',
      'color': '#6b7280'
    },
    '.auth-link': {
      'color': '#667eea',
      'text-decoration': 'none',
      'font-weight': '500'
    },
    '.auth-link:hover': {
      'text-decoration': 'underline'
    },

    // Animations
    '@keyframes float': {
      '0%, 100%': { 'transform': 'translateY(0px)' },
      '50%': { 'transform': 'translateY(-20px)' }
    },
    '@keyframes spin': {
      '0%': { 'transform': 'rotate(0deg)' },
      '100%': { 'transform': 'rotate(360deg)' }
    },

    // Mobile responsive - full screen on small devices
    '@media (max-width: 768px)': {
      '.auth-container': {
        'padding': '0 !important',
        'align-items': 'stretch'
      },
      '.auth-card': {
        'max-width': 'none !important',
        'border-radius': '0 !important',
        'min-height': '100vh !important',
        'display': 'flex',
        'flex-direction': 'column',
        'justify-content': 'center',
        'padding': '2rem 1.5rem !important',
        'box-shadow': 'none !important',
        'border': 'none !important',
        'backdrop-filter': 'none !important',
        'background': 'rgba(255, 255, 255, 1) !important'
      },
      '.auth-bg-orb': {
        'display': 'none'
      }
    },

    // Tablet responsive - also full width
    '@media (max-width: 1024px) and (min-width: 769px)': {
      '.auth-container': {
        'padding': '0 !important',
        'align-items': 'stretch'
      },
      '.auth-card': {
        'max-width': 'none !important',
        'border-radius': '0 !important',
        'min-height': '100vh !important',
        'display': 'flex',
        'flex-direction': 'column',
        'justify-content': 'center',
        'padding': '3rem 2rem !important',
        'box-shadow': 'none !important',
        'border': 'none !important',
        'backdrop-filter': 'none !important',
        'background': 'rgba(255, 255, 255, 1) !important'
      },
      '.auth-bg-orb': {
        'display': 'none'
      }
    }
  }
}

/**
 * Initialize fallback configuration
 * Called when backend is unavailable or user not authenticated
 */
export async function initFallbackConfig() {
  console.info('[site] Initializing fallback configuration')

  const { useLayoutStore } = await import('@/core/stores/layout')
  const layoutStore = useLayoutStore()

  // Apply default layout (all bars hidden, auth widget in main)
  layoutStore.applyConfig(DEFAULT_FALLBACK_CONFIG.routes[0].layout)

  // Apply complete fallback styles
  applyCompleteAuthStyles()

  console.info('[site] Fallback configuration applied')
}

/**
 * Initialize forgot password configuration
 * Called when user navigates to /forgot-password
 */
export async function initForgotPasswordConfig() {
  console.info('[site] Initializing forgot password configuration')

  const { useLayoutStore } = await import('@/core/stores/layout')
  const layoutStore = useLayoutStore()

  // Apply layout for forgot password (all bars hidden, forgot password widget in main)
  layoutStore.applyConfig({
    bars: { t: 0, b: 0, l: 0, r: 0 }, // All bars hidden
    ports: {
      m: ['auth@ForgotPasswordForm'] // Forgot password widget in main
    }
  })

  // Apply complete fallback styles
  applyCompleteAuthStyles()

  console.info('[site] Forgot password configuration applied')
}

/**
 * Apply fallback CSS styles to document
 */
function applyFallbackStyles(styles: Record<string, Record<string, string>>) {
  // Remove existing fallback styles
  const existingStyle = document.getElementById('fallback-styles')
  if (existingStyle) {
    existingStyle.remove()
  }

  // Create new style element
  const styleElement = document.createElement('style')
  styleElement.id = 'fallback-styles'

  let css = ''
  Object.entries(styles).forEach(([selector, properties]) => {
    css += `${selector} {\n`
    Object.entries(properties).forEach(([property, value]) => {
      css += `  ${property}: ${value};\n`
    })
    css += '}\n'
  })

  styleElement.textContent = css
  document.head.appendChild(styleElement)
}
/**
 * Apply complete auth styles with responsive design
 */
function applyCompleteAuthStyles() {
  // Remove existing fallback styles
  const existingStyle = document.getElementById('fallback-styles')
  if (existingStyle) {
    existingStyle.remove()
  }

  // Create new style element with complete auth styles
  const styleElement = document.createElement('style')
  styleElement.id = 'fallback-styles'

  // Complete CSS with all our responsive styles
  styleElement.textContent = `
    /* Complete responsive auth theme */
    .auth-container {
      position: relative;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 1rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      overflow: hidden;
    }
    
    /* Background orbs */
    .auth-bg-orb {
      position: absolute;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      animation: float 6s ease-in-out infinite;
    }
    .auth-bg-orb-1 {
      width: 300px;
      height: 300px;
      top: -150px;
      left: -150px;
      animation-delay: 0s;
    }
    .auth-bg-orb-2 {
      width: 200px;
      height: 200px;
      bottom: -100px;
      right: -100px;
      animation-delay: 2s;
    }
    .auth-bg-orb-3 {
      width: 150px;
      height: 150px;
      top: 20%;
      right: 10%;
      animation-delay: 4s;
    }
    
    /* Main card - responsive */
    .auth-card {
      position: relative;
      z-index: 10;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(20px);
      border-radius: 20px;
      padding: 2.5rem;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
      width: 100%;
      max-width: 420px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    /* Brand section */
    .auth-brand {
      text-align: center;
      margin-bottom: 2rem;
    }
    .auth-logo {
      width: 60px;
      height: 60px;
      margin: 0 auto 1rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }
    .auth-logo svg {
      width: 32px;
      height: 32px;
    }
    .auth-title {
      font-size: 1.875rem;
      font-weight: 700;
      color: #1f2937;
      margin: 0 0 0.5rem 0;
    }
    .auth-subtitle {
      color: #6b7280;
      font-size: 1rem;
      margin: 0;
    }
    
    /* Form styling */
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .auth-form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .auth-label {
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
    }
    .auth-input-container {
      position: relative;
      display: flex;
      align-items: center;
    }
    .auth-input-icon {
      position: absolute;
      left: 1rem;
      color: #9ca3af;
      z-index: 10;
    }
    .auth-input-icon svg {
      width: 20px;
      height: 20px;
    }
    .auth-input {
      width: 100%;
      padding: 0.875rem 1rem 0.875rem 3rem;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 1rem;
      transition: all 0.2s;
      background: white;
    }
    .auth-input:focus {
      outline: none;
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .auth-input:disabled {
      background: #f9fafb;
      cursor: not-allowed;
    }
    
    /* Options row */
    .auth-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin: -0.5rem 0;
    }
    .auth-checkbox-container {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
    }
    .auth-checkbox {
      width: 16px;
      height: 16px;
      accent-color: #667eea;
    }
    .auth-checkbox-label {
      font-size: 0.875rem;
      color: #6b7280;
    }
    .auth-forgot-link {
      background: none;
      border: none;
      color: #667eea;
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: none;
      padding: 0;
    }
    .auth-forgot-link:hover {
      text-decoration: underline;
    }
    
    /* Submit button */
    .auth-submit {
      width: 100%;
      padding: 1rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }
    .auth-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 10px 25px -5px rgba(102, 126, 234, 0.4);
    }
    .auth-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none;
    }
    .auth-loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-top: 2px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    
    /* Messages */
    .auth-error {
      color: #dc2626;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .auth-error-banner {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 1rem;
      border-radius: 12px;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .auth-error-icon svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .auth-error-content h4 {
      margin: 0 0 0.25rem 0;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .auth-error-content p {
      margin: 0;
      font-size: 0.875rem;
    }
    .auth-success-banner {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      padding: 1rem;
      border-radius: 12px;
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .auth-success-icon svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .auth-success-content h4 {
      margin: 0 0 0.25rem 0;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .auth-success-content p {
      margin: 0;
      font-size: 0.875rem;
    }
    
    /* Footer */
    .auth-footer {
      text-align: center;
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e7eb;
    }
    .auth-footer p {
      margin: 0;
      font-size: 0.875rem;
      color: #6b7280;
    }
    .auth-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
    }
    .auth-link:hover {
      text-decoration: underline;
    }
    
    /* Animations */
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Mobile responsive - full screen on small devices */
    @media (max-width: 768px) {
      .auth-container {
        padding: 0 !important;
        align-items: stretch;
      }
      .auth-card {
        max-width: none !important;
        border-radius: 0 !important;
        min-height: 100vh !important;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 2rem 1.5rem !important;
        box-shadow: none !important;
        border: none !important;
        backdrop-filter: none !important;
        background: rgba(255, 255, 255, 1) !important;
      }
      .auth-bg-orb {
        display: none;
      }
    }
    
    /* Tablet responsive - also full width */
    @media (max-width: 1024px) and (min-width: 769px) {
      .auth-container {
        padding: 0 !important;
        align-items: stretch;
      }
      .auth-card {
        max-width: none !important;
        border-radius: 0 !important;
        min-height: 100vh !important;
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 3rem 2rem !important;
        box-shadow: none !important;
        border: none !important;
        backdrop-filter: none !important;
        background: rgba(255, 255, 255, 1) !important;
      }
      .auth-bg-orb {
        display: none;
      }
    }
    
    /* Dashboard Default Widget Styles */
    .dashboard-default {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
      min-height: 100vh;
    }

    .welcome-header {
      text-align: center;
      margin-bottom: 3rem;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      color: white;
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
    }

    .welcome-header h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 1rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .welcome-header p {
      font-size: 1.25rem;
      opacity: 0.9;
      margin: 0;
    }

    .welcome-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .welcome-card {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      border: 1px solid #e2e8f0;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .welcome-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, #667eea, #764ba2);
    }

    .welcome-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    }

    .card-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      display: block;
    }

    .welcome-card h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 0.5rem;
    }

    .welcome-card p {
      color: #6b7280;
      font-size: 1rem;
      margin: 0;
    }

    .status-ok {
      color: #059669 !important;
      font-weight: 600;
    }

    .welcome-actions {
      display: flex;
      gap: 1.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary {
      padding: 1rem 2rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      min-width: 200px;
      position: relative;
      overflow: hidden;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.6);
    }

    .btn-secondary {
      background: white;
      color: #374151;
      border: 2px solid #e2e8f0;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .btn-secondary:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    @media (max-width: 768px) {
      .dashboard-default {
        padding: 1rem;
      }
      
      .welcome-header {
        padding: 1.5rem;
        margin-bottom: 2rem;
      }
      
      .welcome-header h1 {
        font-size: 2rem;
      }
      
      .welcome-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
      
      .welcome-actions {
        flex-direction: column;
        align-items: center;
      }
      
      .btn-primary, .btn-secondary {
        width: 100%;
        max-width: 300px;
      }
    }
  `

  document.head.appendChild(styleElement)
}