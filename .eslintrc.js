module.exports = {
  extends: 'airbnb-base',
  rules: {
    'comma-dangle': ['error', 'never'],
    'object-curly-newline': ['error', { multiline: true, consistent: true }],
    semi: ['error', 'never']
  },
  env: {
    jest: true
  }
}
