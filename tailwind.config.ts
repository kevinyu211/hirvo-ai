import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        // Score colors
        score: {
          excellent: "hsl(var(--score-excellent))",
          good: "hsl(var(--score-good))",
          warning: "hsl(var(--score-warning))",
          danger: "hsl(var(--score-danger))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      // Bold border radius system
      borderRadius: {
        sm: "0.625rem",     // 10px - Badges, chips, small tags
        DEFAULT: "1rem",    // 16px - Buttons, inputs (base)
        md: "1rem",         // 16px - Buttons, inputs
        lg: "1.25rem",      // 20px - Small cards, dropdowns
        xl: "1.5rem",       // 24px - Standard cards
        "2xl": "2rem",      // 32px - Feature cards, modals
        "3xl": "2.5rem",    // 40px - Hero cards, mobile drawer
        "4xl": "3rem",      // 48px - Ultra-modern elements
      },
      fontFamily: {
        sans: ["DM Sans", "system-ui", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
      },
      // Dramatic shadow & glow system
      boxShadow: {
        // Soft shadows (keeping for compatibility)
        "soft-sm": "0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 3px -1px rgba(0, 0, 0, 0.03)",
        "soft": "0 4px 14px -4px rgba(0, 0, 0, 0.08), 0 2px 6px -2px rgba(0, 0, 0, 0.04)",
        "soft-lg": "0 8px 28px -6px rgba(0, 0, 0, 0.1), 0 4px 12px -4px rgba(0, 0, 0, 0.05)",
        "soft-xl": "0 16px 48px -10px rgba(0, 0, 0, 0.12), 0 8px 20px -6px rgba(0, 0, 0, 0.06)",
        // Dramatic layered shadows
        "dramatic": "0 4px 6px -1px rgba(0,0,0,0.05), 0 10px 20px -5px rgba(0,0,0,0.08), 0 25px 50px -12px rgba(0,0,0,0.12)",
        "dramatic-lg": "0 10px 15px -3px rgba(0,0,0,0.06), 0 20px 40px -10px rgba(0,0,0,0.1), 0 40px 80px -20px rgba(0,0,0,0.15)",
        // Float shadows for elevated elements
        "float": "0 25px 50px -12px rgba(0,0,0,0.2), 0 12px 24px -8px rgba(0,0,0,0.1)",
        "float-lg": "0 35px 60px -15px rgba(0,0,0,0.25), 0 20px 40px -10px rgba(0,0,0,0.15)",
        // Basic glows
        "glow": "0 0 20px -5px hsl(var(--accent) / 0.4)",
        "glow-lg": "0 0 40px -10px hsl(var(--accent) / 0.5)",
        "inner-glow": "inset 0 1px 0 0 rgba(255, 255, 255, 0.1)",
        // Dramatic emerald glows
        "glow-emerald": "0 0 20px -5px hsl(158 64% 40% / 0.4), 0 8px 30px -8px hsl(158 64% 40% / 0.3)",
        "glow-emerald-lg": "0 0 40px -10px hsl(158 64% 40% / 0.5), 0 15px 50px -15px hsl(158 64% 40% / 0.35)",
        "glow-emerald-intense": "0 0 60px -15px hsl(158 64% 40% / 0.6), 0 0 100px -30px hsl(158 64% 40% / 0.4)",
        // Inner glows for depth
        "inner-glow-emerald": "inset 0 0 20px -10px hsl(158 64% 40% / 0.2)",
        // Card hover state
        "card-hover": "0 10px 15px -3px rgba(0,0,0,0.06), 0 20px 40px -10px rgba(0,0,0,0.1), 0 40px 80px -20px rgba(0,0,0,0.15), 0 0 30px -10px hsl(158 64% 40% / 0.2)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "collapsible-down": {
          from: { height: "0" },
          to: { height: "var(--radix-collapsible-content-height)" },
        },
        "collapsible-up": {
          from: { height: "var(--radix-collapsible-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        // Bold scale-bounce entrance
        "scale-bounce-in": {
          "0%": { transform: "scale(0.9)", opacity: "0" },
          "50%": { transform: "scale(1.03)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "slide-in-from-top": {
          from: { opacity: "0", transform: "translateY(-10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-from-bottom": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-from-left": {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-from-right": {
          from: { opacity: "0", transform: "translateX(10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "draw": {
          from: { strokeDashoffset: "var(--circumference, 440)" },
          to: { strokeDashoffset: "var(--offset, 0)" },
        },
        "number-increment": {
          from: { "--num": "0" },
          to: { "--num": "var(--target, 100)" },
        },
        // Dramatic float animation
        "float-dramatic": {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "25%": { transform: "translateY(-8px) rotate(0.5deg)" },
          "75%": { transform: "translateY(-4px) rotate(-0.5deg)" },
        },
        // Glow pulse for excellent scores
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 20px -5px hsl(158 64% 40% / 0.4), 0 8px 30px -8px hsl(158 64% 40% / 0.3)",
          },
          "50%": {
            boxShadow: "0 0 40px -5px hsl(158 64% 40% / 0.6), 0 15px 50px -10px hsl(158 64% 40% / 0.4)",
          },
        },
        // Shimmer sweep for loading
        "shimmer-sweep": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Border glow animation
        "border-glow": {
          "0%, 100%": { borderColor: "hsl(158 64% 40% / 0.2)" },
          "50%": { borderColor: "hsl(158 64% 40% / 0.5)" },
        },
        // Success celebration
        "success-celebration": {
          "0%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.05)" },
          "50%": { transform: "scale(0.98)" },
          "100%": { transform: "scale(1)" },
        },
        // Spring entrance for mobile drawer
        "spring-up": {
          "0%": { transform: "translateY(100%)" },
          "70%": { transform: "translateY(-3%)" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "collapsible-down": "collapsible-down 0.2s ease-out",
        "collapsible-up": "collapsible-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "fade-up": "fade-up 0.5s ease-out",
        "scale-in": "scale-in 0.3s ease-out",
        "scale-bounce-in": "scale-bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "slide-in-from-top": "slide-in-from-top 0.3s ease-out",
        "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out",
        "slide-in-from-left": "slide-in-from-left 0.3s ease-out",
        "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "draw": "draw 1s ease-out forwards",
        // New dramatic animations
        "float-dramatic": "float-dramatic 12s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "shimmer-sweep": "shimmer-sweep 2s linear infinite",
        "border-glow": "border-glow 2s ease-in-out infinite",
        "success-celebration": "success-celebration 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "spring-up": "spring-up 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      transitionTimingFunction: {
        "bounce-in": "cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "smooth": "cubic-bezier(0.4, 0, 0.2, 1)",
        // Dramatic spring curves
        "spring": "cubic-bezier(0.34, 1.56, 0.64, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
        "out-back": "cubic-bezier(0.34, 1.3, 0.64, 1)",
        "elastic": "cubic-bezier(0.68, -0.6, 0.32, 1.6)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
