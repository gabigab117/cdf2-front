import { globalIgnores } from 'eslint/config'
import betterTailwindcss from 'eslint-plugin-better-tailwindcss'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Generated from the back end's OpenAPI schema (npm run api:types).
  globalIgnores(['app/types/api.d.ts']),
  {
    files: ['**/*.vue'],
    plugins: { 'better-tailwindcss': betterTailwindcss },
    settings: {
      'better-tailwindcss': {
        // Tailwind v4 is configured in CSS: the rules read the design tokens here.
        entryPoint: 'app/assets/css/main.css',
      },
    },
    rules: {
      'better-tailwindcss/enforce-consistent-class-order': 'error',
      'better-tailwindcss/no-unknown-classes': 'error',
    },
  },
)
