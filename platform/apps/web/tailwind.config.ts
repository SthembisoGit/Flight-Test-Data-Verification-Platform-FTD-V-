import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: 'rgb(var(--panel) / <alpha-value>)',
        panelAlt: 'rgb(var(--panel-alt) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        warning: 'rgb(var(--warning) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        success: 'rgb(var(--success) / <alpha-value>)'
      },
      boxShadow: {
        neon: '0 0 0 1px rgba(34, 211, 238, 0.25), 0 0 22px rgba(34, 211, 238, 0.16)'
      }
    }
  },
  plugins: []
};

export default config;
