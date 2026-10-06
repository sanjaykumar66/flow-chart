import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginVueA11y from 'eslint-plugin-vuejs-accessibility'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// ESLint checks Vue templates and TypeScript; Prettier owns formatting.
export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,

  // Accessibility in templates: labels, alt text, keyboard handlers for click targets, ARIA use.
  ...pluginVueA11y.configs['flat/recommended'],
  {
    name: 'app/a11y',
    files: ['**/*.vue'],
    rules: {
      // Naive UI wraps native inputs, so look for its components as the labelled controls too.
      'vuejs-accessibility/form-control-has-label': [
        'error',
        { labelComponents: ['NFormItem'], controlComponents: ['NInput', 'NSelect', 'NTimePicker'] },
      ],
      'vuejs-accessibility/label-has-for': [
        'error',
        {
          controlComponents: ['NTimePicker', 'NSelect', 'NInput'],
          required: { some: ['nesting', 'id'] },
        },
      ],
      // Autofocus moves screen-reader users without warning.
      'vuejs-accessibility/no-autofocus': 'error',
    },
  },

  skipFormatting,
)
