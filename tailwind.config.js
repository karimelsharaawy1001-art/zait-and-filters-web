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
                'racing-red': '#e31e24',         // Primary Accent
                'racing-red-dark': '#b8181d',    // Hover actions

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
                'primary-red': '#e31e24',
            },
            borderRadius: {
                'premium': '12px',
                'admin-card': '12px',
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
