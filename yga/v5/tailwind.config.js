// Tailwind config for yga_website_v5.html. Build: `node tools/build-v5.mjs`.
// Palette comes from the index site (forest / cream / gold); type comes from v4.
module.exports = {
  content: ['./yga/v5/src.html'],
  theme: {
    extend: {
      colors: {
        forest: '#08261e',
        forestdeep: '#061c16',
        forestsoft: '#0f3a2d',
        moss: '#2c5443',
        cream: '#f7efdf',
        sand: '#f1e8d6',
        linen: '#fbf7ef',
        gold: '#dfb578',
        goldhi: '#f3d9a6',
        goldlo: '#a9793d',
        bronze: '#8a5f2c',
        sage: '#d6d9cf',
        muted: '#b8b8a8',
        ink: '#18221a'
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      }
    }
  }
};
