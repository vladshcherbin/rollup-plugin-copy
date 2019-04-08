import babel from 'rollup-plugin-babel'

export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/index.commonjs.js',
      format: 'commonjs'
    },
    {
      file: 'dist/index.module.js',
      format: 'module'
    }
  ],
  plugins: [
    babel({
      presets: [['@babel/preset-env', { targets: { node: 8 } }]],
      comments: false
    })
  ],
  external: ['chalk', 'fs-extra', 'is-plain-object', 'path']
}
