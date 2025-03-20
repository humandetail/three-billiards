import antfu from '@antfu/eslint-config'

export default antfu({
  stylistic: {
    indent: 2,
    quotes: 'single',
    semi: false,
  },

  typescript: true,
  vue: false,
  jsonc: false,
  yaml: false,

  ignores: []
})
