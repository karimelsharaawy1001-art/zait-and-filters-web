/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        screens: {
            '2xs': '320px',
            'xs': '375px',
            'sm': '640px',
            'md': '768px',
            'lg': '1024px',
            'xl': '1280px',
            '2xl': '1536px',
        },
        extend: {
            colors: {
                // PREMIUM DARK THEME (HIGH-END AUTOMOTIVE)
                'matte-black': '#0a0a0b',        // Global Background
                'carbon-grey': '#1a1c23',        // Card & Sidebar Background
                'racing-red': '#28B463',         // Primary Accent (Now Green)
                'racing-red-dark': '#219653',    // Hover actions (Darker Green)

                // New Brand Keys
                'brand-green': '#28B463',
                'brand-orange': '#FF8C00',
                'brand-charcoal': '#1A1A1A',

                // Typography System
                'snow-white': '#ffffff',         // Primary Headings
                'silver-grey': '#cccccc',        // Secondary Stats/Details
                'dim-grey': '#666666',           // Muted labels

                // Background & Surface Aliases
                'main-bg': '#0a0a0b',
                'side-bg': '#1a1c23',
                'surface': '#1a1c23',
                'border-dark': '#2c2e33',

                // Legacy Standardized Theme Variables (for compatibility during migration)
                'dark-bg': '#0a0a0b',
                'card-bg': '#1a1c23',
                'primary-red': '#28B463', // Mapped to Green

                // ADMIN PANEL LIGHT THEME TOKENS
                'admin-bg': '#f9fafb',           // gray-50
                'admin-card': '#ffffff',         // white
                'admin-border': '#e5e7eb',       // gray-200
                'admin-red': '#28B463',          // Brand Red -> Brand Green
                'admin-red-dark': '#219653',     // Brand Red Dark -> Brand Green Dark
                'admin-accent': '#FF8C00',       // Orange Accent
                'admin-green': '#28B463',        // Success states
                'admin-text-primary': '#1A1A1A', // Charcoal
                'admin-text-secondary': '#6b7280', // gray-500
            },
            borderRadius: {
                'premium': '12px',
                'admin-card': '24px',            // Rounder for modern UI
            },
            fontFamily: {
                sans: ['Inter', 'Poppins', 'Roboto', 'Cairo', 'sans-serif'],
                poppins: ['Poppins', 'sans-serif'],
                roboto: ['Roboto', 'sans-serif'],
                cairo: ['Cairo', 'sans-serif'],
                inter: ['Inter', 'sans-serif'],
            },
            boxShadow: {
                'premium-3d': '0 20px 40px rgba(0,0,0,0.8)',
                'admin': '0 1px 20px 0px rgba(0,0,0,0.1)',
                'admin-glow': '0 0 15px rgba(227, 30, 36, 0.4)',
            }
        },
    },
    plugins: [],
}
