/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                background: 'rgb(var(--color-background) / <alpha-value>)',
                surface: 'rgb(var(--color-surface) / <alpha-value>)',
                'surface-hover': 'rgb(var(--color-surface-hover) / <alpha-value>)',
                primary: 'rgb(var(--color-primary) / <alpha-value>)',
                'primary-hover': 'rgb(var(--color-primary-hover) / <alpha-value>)',
                'text-main': 'rgb(var(--color-text-main) / <alpha-value>)',
                'text-muted': 'rgb(var(--color-text-muted) / <alpha-value>)',
                border: 'rgb(var(--color-border) / <alpha-value>)',
                success: 'rgb(var(--color-success) / <alpha-value>)',
                error: 'rgb(var(--color-error) / <alpha-value>)',
            },
            fontFamily: {
                heading: ['Cinzel', 'serif'],
                body: ['Inter', 'sans-serif'],
            },
            boxShadow: {
                'luxury': '0 4px 16px rgba(0, 0, 0, 0.4)',
                'gold-glow': '0 0 15px rgba(203, 163, 90, 0.15)',
                'gold-glow-hover': '0 0 20px rgba(230, 196, 106, 0.4)',
            }
        },
    },
    plugins: [],
}
