/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        priority: {
          p1: '#d14d4d',
          p2: '#d6a400',
          p3: '#2f6ec8',
          p4: '#1a4b8f'
        }
      }
    }
  },
  plugins: []
};
