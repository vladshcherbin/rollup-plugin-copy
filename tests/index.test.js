import { rollup } from 'rollup'
import fs from 'fs-extra'
import { green } from 'chalk'
import copy from '../src'

process.chdir(`${__dirname}/fixtures`)

afterEach(async () => {
  await fs.remove('build')
  await fs.remove('dist')
})

async function build(options) {
  await rollup({
    input: 'src/index.js',
    plugins: [
      copy(options)
    ]
  })
}

describe('Copy', () => {
  test('No config passed', async () => {
    await build()

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)
  })

  test('Empty array as target', async () => {
    await build({
      targets: []
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)
  })

  test('Files', async () => {
    await build({
      targets: [{
        src: [
          'src/assets/asset-1.js',
          'src/assets/asset-2.js'
        ],
        dest: 'dist'
      }]
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/asset-2.js')).toBe(true)
  })

  test('Folders', async () => {
    await build({
      targets: [{
        src: [
          'src/assets/css',
          'src/assets/scss'
        ],
        dest: 'dist'
      }]
    })

    expect(await fs.pathExists('dist/css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-1.css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-2.css')).toBe(true)
    expect(await fs.pathExists('dist/scss')).toBe(true)
    expect(await fs.pathExists('dist/scss/scss-1.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss/scss-2.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss/nested')).toBe(true)
    expect(await fs.pathExists('dist/scss/nested/scss-3.scss')).toBe(true)
  })

  test('Glob', async () => {
    await build({
      targets: [{
        src: [
          'src/assets/asset-{1,2}.js',
          'src/assets/css/*.css',
          '!**/css-1.css',
          'src/assets/scss/scss-?(1).scss'
        ],
        dest: 'dist'
      }]
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/asset-2.js')).toBe(true)
    expect(await fs.pathExists('dist/css-1.css')).toBe(false)
    expect(await fs.pathExists('dist/css-2.css')).toBe(true)
    expect(await fs.pathExists('dist/scss-1.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss-2.scss')).toBe(false)
  })

  test('Multiple objects as targets', async () => {
    await build({
      targets: [
        { src: ['src/assets/*', 'src/assets/css'], dest: 'dist' },
        { src: 'src/assets/css/*.css', dest: 'build' }
      ]
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/asset-2.js')).toBe(true)
    expect(await fs.pathExists('dist/css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-1.css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-2.css')).toBe(true)
    expect(await fs.pathExists('build/css-1.css')).toBe(true)
    expect(await fs.pathExists('build/css-2.css')).toBe(true)
  })

  test('Same target', async () => {
    await build({
      targets: [
        { src: 'src/assets/css', dest: 'dist' },
        { src: 'src/assets/css', dest: 'dist' },
        { src: ['src/assets/asset-1.js', 'src/assets/asset-1.js'], dest: 'build' }
      ],
      outputFolder: 'dist'
    })

    expect(await fs.pathExists('dist/css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-1.css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-2.css')).toBe(true)
    expect(await fs.pathExists('build/asset-1.js')).toBe(true)
  })

  test('Throw if target is not an object', async () => {
    await expect(build({
      targets: [
        'src/assets/asset-1.js'
      ]
    })).rejects.toThrow('target should be an object - \'src/assets/asset-1.js\'')
  })

  test('Throw if target is an object with no src or dest', async () => {
    await expect(build({
      targets: [
        { src: 'src/assets/asset-1.js' }
      ]
    })).rejects.toThrow('\'src\' or \'dest\' is not set in { src: \'src/assets/asset-1.js\' }')
  })
})

describe('Options', () => {
  /* eslint-disable no-console */
  test('Verbose', async () => {
    console.log = jest.fn()

    await build({
      targets: [{
        src: [
          'src/assets/asset-1.js',
          'src/assets/css/*',
          'src/assets/scss',
          'src/not-exist'
        ],
        dest: 'dist'
      }],
      verbose: true
    })

    expect(console.log).toHaveBeenCalledTimes(5)
    expect(console.log).toHaveBeenCalledWith('Copied files and folders:')
    expect(console.log).toHaveBeenCalledWith(green('src/assets/asset-1.js -> dist/asset-1.js'))
    expect(console.log).toHaveBeenCalledWith(green('src/assets/css/css-1.css -> dist/css-1.css'))
    expect(console.log).toHaveBeenCalledWith(green('src/assets/css/css-2.css -> dist/css-2.css'))
    expect(console.log).toHaveBeenCalledWith(green('src/assets/scss -> dist/scss'))
  })

  test('Verbose, no items to copy', async () => {
    console.log = jest.fn()

    await build({
      targets: [
        { src: 'src/not-exist', dest: 'dist' }
      ],
      verbose: true
    })

    expect(console.log).toHaveBeenCalledTimes(1)
    expect(console.log).toHaveBeenCalledWith('No items to copy')
  })
  /* eslint-enable no-console */

  test('Hook', async () => {
    await build({
      targets: [{
        src: ['src/assets/asset-1.js', 'src/assets/css'],
        dest: 'dist'
      }],
      hook: 'buildStart'
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-1.css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-2.css')).toBe(true)
  })

  test('Rest options', async () => {
    await expect(build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist' }
      ],
      transform: () => 'src/not-exist'
    })).rejects.toThrow('ENOENT: no such file or directory, stat \'src/not-exist\'')
  })
})
