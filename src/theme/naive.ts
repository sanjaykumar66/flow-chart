import type { GlobalThemeOverrides } from 'naive-ui'

/**
 * Naive UI theme: blue primary (Tailwind blue palette) instead of the default green,
 * and 8px corners to match the node cards (Tailwind `rounded-lg`).
 */
export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#2563eb', // blue-600
    primaryColorHover: '#3b82f6', // blue-500
    primaryColorPressed: '#1d4ed8', // blue-700
    primaryColorSuppl: '#3b82f6', // blue-500
    borderRadius: '8px',
  },
}
