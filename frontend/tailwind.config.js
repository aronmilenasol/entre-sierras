const palette = {
  light: {
    background: '#F3F2EA',
    text: '#293831',
    primary: '#405343',
    secondary: '#526B56',
    accent: '#3C6873',
  },
  dark: {
    background: '#17231F',
    text: '#E9E9DE',
    primary: '#7fa485',
    secondary: '#A3B89B',
    accent: '#85B9C0',
  },
};

const withOpacity = color => ({ opacityValue }) => opacityValue === undefined
  ? `var(--color-${color})`
  : `color-mix(in srgb, var(--color-${color}) ${opacityValue * 100}%, transparent)`;

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: withOpacity('background'),
        text: withOpacity('text'),
        primary: withOpacity('primary'),
        secondary: withOpacity('secondary'),
        accent: withOpacity('accent'),
        palette,
      },
      fontFamily: {
        body: ['DM Sans', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
