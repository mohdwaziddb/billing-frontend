/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#07111f",
        cyanGlow: "#67e8f9",
        mintGlow: "#a7f3d0",
        roseGlow: "#fda4af"
      },
      boxShadow: {
        glass: "0 20px 60px rgba(10, 24, 46, 0.35)"
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shine: "shine 1.4s ease-in-out infinite"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        },
        shine: {
          "0%": { opacity: "0.5", transform: "translateX(-4px)" },
          "50%": { opacity: "1", transform: "translateX(4px)" },
          "100%": { opacity: "0.5", transform: "translateX(-4px)" }
        }
      }
    }
  },
  plugins: []
};
