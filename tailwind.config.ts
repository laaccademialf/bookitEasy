import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 20px 80px rgba(59, 130, 246, 0.15)',
      },
      backgroundImage: {
        'radial-soft': 'radial-gradient(circle at top, rgba(56, 189, 248, 0.15), transparent 40%)',
      },
    },
  },
  plugins: [],
};

export default config;
