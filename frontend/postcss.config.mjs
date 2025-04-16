# Check if postcss.config.js exists
if [ -f postcss.config.js ]; then
  # Make sure it includes tailwindcss
  cat > postcss.config.js << 'EOL'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOL
