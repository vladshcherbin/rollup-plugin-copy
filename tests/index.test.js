import { rollup } from 'rollup'
import fs from 'fs-extra'
import { green, red } from 'chalk'
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

  test('No targets', async () => {
    await build({
      targets: []
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)
  })

  test('Files', async () => {
    await build({
      targets: [
        'src/assets/asset-1.js',
        'src/assets/asset-2.js'
      ],
      outputFolder: 'dist'
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/asset-2.js')).toBe(true)
  })

  test('Folders', async () => {
    await build({
      targets: [
        'src/assets/css',
        'src/assets/scss'
      ],
      outputFolder: 'dist'
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
      targets: [
        'src/assets/asset-{1,2}.js',
        ['src/assets/css/*.css', '!**/css-1.css'],
        'src/assets/scss/scss-?(1).scss'
      ],
      outputFolder: 'dist'
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/asset-2.js')).toBe(true)
    expect(await fs.pathExists('dist/css-1.css')).toBe(false)
    expect(await fs.pathExists('dist/css-2.css')).toBe(true)
    expect(await fs.pathExists('dist/scss-1.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss-2.scss')).toBe(false)
  })

  test('Object syntax', async () => {
    await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist' },
        { src: 'src/assets/css', dest: 'dist' },
        { src: 'src/assets/css/*.css', dest: 'build' },
        { src: ['src/assets/scss/*', '!**/scss-2.scss'], dest: 'build/scss' }
      ]
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-1.css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-2.css')).toBe(true)
    expect(await fs.pathExists('build/css-1.css')).toBe(true)
    expect(await fs.pathExists('build/css-2.css')).toBe(true)
    expect(await fs.pathExists('build/scss/scss-1.scss')).toBe(true)
    expect(await fs.pathExists('build/scss/scss-2.scss')).toBe(false)
    expect(await fs.pathExists('build/scss/nested')).toBe(true)
    expect(await fs.pathExists('build/scss/nested/scss-3.scss')).toBe(true)
  })

  test('Mixed syntax', async () => {
    await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist' },
        { src: 'src/assets/scss', dest: 'dist' },
        { src: ['src/assets/css/*.css', '!**/css-1.css'], dest: 'dist' },
        'src/assets/asset-2.js',
        'src/assets/css',
        ['src/assets/scss/**/*.scss', '!**/scss-2.scss']
      ],
      outputFolder: 'build'
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/scss/scss-1.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss/scss-2.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss/nested')).toBe(true)
    expect(await fs.pathExists('dist/scss/nested/scss-3.scss')).toBe(true)
    expect(await fs.pathExists('dist/css')).toBe(false)
    expect(await fs.pathExists('dist/css-1.css')).toBe(false)
    expect(await fs.pathExists('dist/css-2.css')).toBe(true)
    expect(await fs.pathExists('build/asset-2.js')).toBe(true)
    expect(await fs.pathExists('build/css')).toBe(true)
    expect(await fs.pathExists('build/css/css-1.css')).toBe(true)
    expect(await fs.pathExists('build/css/css-2.css')).toBe(true)
    expect(await fs.pathExists('build/scss-1.scss')).toBe(true)
    expect(await fs.pathExists('build/scss-2.scss')).toBe(false)
    expect(await fs.pathExists('build/scss-3.scss')).toBe(true)
  })

  test('Same target', async () => {
    await build({
      targets: [
        'src/assets/css',
        'src/assets/css'
      ],
      outputFolder: 'dist'
    })

    expect(await fs.pathExists('dist/css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-1.css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-2.css')).toBe(true)
  })

  test('Throw if target is an object with no src or dest', async () => {
    await expect(build({
      targets: [
        { src: 'src/assets/asset-1.js' }
      ]
    })).rejects.toThrow('\'src\' or \'dest\' is not set in { src: \'src/assets/asset-1.js\' }')
  })

  test('Throw if target is not an object and outputFolder is not set ', async () => {
    await expect(build({
      targets: [
        'src/assets/asset-*.js'
      ]
    })).rejects.toThrow('\'outputFolder\' is not set for \'src/assets/asset-*.js\'')
  })
})

describe('Options', () => {
  test('Hook', async () => {
    await build({
      targets: [
        'src/assets/asset-1.js',
        'src/assets/css'
      ],
      outputFolder: 'dist',
      hook: 'buildStart'
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-1.css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-2.css')).toBe(true)
  })

  /* eslint-disable no-console */
  test('Verbose', async () => {
    console.log = jest.fn()

    await build({
      targets: [
        'src/assets/asset-1.js',
        'src/assets/css/*',
        'src/assets/scss',
        'src/not-exist'
      ],
      outputFolder: 'dist',
      verbose: true
    })

    expect(console.log).toHaveBeenCalledTimes(6)
    expect(console.log).toHaveBeenCalledWith('Copied files and folders:')
    expect(console.log).toHaveBeenCalledWith(green('\'src/assets/asset-1.js\' -> \'dist/asset-1.js\''))
    expect(console.log).toHaveBeenCalledWith(green('\'src/assets/css/css-1.css\' -> \'dist/css-1.css\''))
    expect(console.log).toHaveBeenCalledWith(green('\'src/assets/css/css-2.css\' -> \'dist/css-2.css\''))
    expect(console.log).toHaveBeenCalledWith(green('\'src/assets/scss\' -> \'dist/scss\''))
    expect(console.log).toHaveBeenCalledWith(red('\'src/not-exist\' -> \'dist\' (no items to copy)'))
  })

  test('Warn if target doesn\'t exist', async () => {
    console.warn = jest.fn()

    await build({
      targets: [
        'src/assets/asset-1.js',
        'src/assets/scss',
        'src/not-exist',
        ['src/not-exist-glob-*', '!**/*.css'],
        { src: 'src/images/*', dest: 'dist/images' }
      ],
      outputFolder: 'dist',
      warnOnNonExist: true
    })

    expect(console.warn).toHaveBeenCalledTimes(3)
    expect(console.warn).toHaveBeenCalledWith('No items to copy - \'src/not-exist\' -> \'dist\'')
    expect(console.warn)
      .toHaveBeenCalledWith('No items to copy - [ \'src/not-exist-glob-*\', \'!**/*.css\' ] -> \'dist\'')
    expect(console.warn).toHaveBeenCalledWith('No items to copy - \'src/images/*\' -> \'dist/images\'')
  })
  /* eslint-enable no-console */

  test('Rest options', async () => {
    await expect(build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'src' }
      ],
      transform: () => 'src/not-exist'
    })).rejects.toThrow('ENOENT: no such file or directory, stat \'src/not-exist\'')
  })
})
