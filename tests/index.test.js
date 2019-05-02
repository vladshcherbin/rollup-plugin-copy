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

describe('Targets is an array', () => {
  test('Empty array', async () => {
    await build({
      targets: []
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)
  })

  test('Single file', async () => {
    await build({
      targets: [
        'src/assets/asset-1.js'
      ],
      outputFolder: 'dist'
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
  })

  test('Multiple files', async () => {
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

  test('Throw if outputFolder is not set', async () => {
    await expect(build({
      targets: [
        'src/assets/asset-1.js'
      ]
    })).rejects.toThrow('\'outputFolder\' is not set. It is required if \'targets\' is an array')
  })

  test('Don\'t throw if file doesn\'t exist', async () => {
    await expect(build({
      targets: [
        'src/assets/asset-3.js'
      ],
      outputFolder: 'dist'
    })).resolves.not.toThrow()
  })

  test('Don\'t throw if folder doesn\'t exist', async () => {
    await expect(build({
      targets: [
        'src/assets/js'
      ],
      outputFolder: 'dist'
    })).resolves.not.toThrow()
  })
})

describe('Targets is an object', () => {
  test('Empty object', async () => {
    await build({
      targets: {}
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)
  })

  test('Single file', async () => {
    await build({
      targets: {
        'src/assets/asset-1.js': 'dist/asset-1.js'
      }
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
  })

  test('Multiple files', async () => {
    await build({
      targets: {
        'src/assets/asset-1.js': 'dist/asset-1.js',
        'src/assets/asset-2.js': 'dist/asset-2.js'
      }
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/asset-2.js')).toBe(true)
  })

  test('Folders', async () => {
    await build({
      targets: {
        'src/assets/css': 'dist/css',
        'src/assets/scss': 'dist/scss'
      }
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

  test('Nested output path', async () => {
    await build({
      targets: {
        'src/assets/scss': 'dist/nested/folder'
      }
    })

    expect(await fs.pathExists('dist/nested/folder')).toBe(true)
    expect(await fs.pathExists('dist/nested/folder/scss-1.scss')).toBe(true)
    expect(await fs.pathExists('dist/nested/folder/scss-2.scss')).toBe(true)
    expect(await fs.pathExists('dist/nested/folder/nested')).toBe(true)
    expect(await fs.pathExists('dist/nested/folder/nested/scss-3.scss')).toBe(true)
  })

  test('Array output path', async () => {
    await build({
      targets: {
        'src/assets/asset-1.js': [],
        'src/assets/asset-2.js': ['dist/asset-2.js', 'build/asset-2.js'],
        'src/assets/scss': ['dist/scss', 'build/scss']
      }
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)
    expect(await fs.pathExists('dist/asset-2.js')).toBe(true)
    expect(await fs.pathExists('build/asset-2.js')).toBe(true)
    expect(await fs.pathExists('dist/scss')).toBe(true)
    expect(await fs.pathExists('dist/scss/scss-1.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss/scss-2.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss/nested')).toBe(true)
    expect(await fs.pathExists('dist/scss/nested/scss-3.scss')).toBe(true)
    expect(await fs.pathExists('build/scss')).toBe(true)
    expect(await fs.pathExists('build/scss/scss-1.scss')).toBe(true)
    expect(await fs.pathExists('build/scss/scss-2.scss')).toBe(true)
    expect(await fs.pathExists('build/scss/nested')).toBe(true)
    expect(await fs.pathExists('build/scss/nested/scss-3.scss')).toBe(true)
  })

  test('Don\'t throw if file doesn\'t exist', async () => {
    await expect(build({
      targets: {
        'src/assets/asset-3.js': 'dist/assets/asset-3.js'
      }
    })).resolves.not.toThrow()
  })

  test('Don\'t throw if folder doesn\'t exist', async () => {
    await expect(build({
      targets: {
        'src/assets/js': 'dist/assets/js'
      }
    })).resolves.not.toThrow()
  })
})

describe('Options', () => {
  test('No options passed', async () => {
    await build()

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)
  })

  /* eslint-disable no-console */
  test('Verbose', async () => {
    console.log = jest.fn()

    await build({
      targets: [
        'src/assets/asset-1.js',
        'src/assets/scss',
        'src/not-exist'
      ],
      outputFolder: 'dist',
      verbose: true
    })

    expect(console.log).toHaveBeenCalledTimes(4)
    expect(console.log).toHaveBeenCalledWith('Copied files and folders:')
    expect(console.log).toHaveBeenCalledWith(green('src/assets/asset-1.js -> dist/asset-1.js'))
    expect(console.log).toHaveBeenCalledWith(green('src/assets/scss -> dist/scss'))
    expect(console.log).toHaveBeenCalledWith(
      red('src/not-exist -> dist/not-exist (no such file or folder: src/not-exist)')
    )
  })

  test('Warn if target doesn\'t exist', async () => {
    console.warn = jest.fn()

    await build({
      targets: [
        'src/assets/asset-1.js',
        'src/assets/scss',
        'src/not-exist'
      ],
      outputFolder: 'dist',
      warnOnNonExist: true
    })

    expect(console.warn).toHaveBeenCalledTimes(1)
    expect(console.warn).toHaveBeenCalledWith('ENOENT: no such file or directory, stat \'src/not-exist\'')
  })
  /* eslint-enable no-console */

  test('Rest options', async () => {
    await expect(build({
      targets: {
        'src/assets/asset-1.js': 'src/existing.js'
      },
      overwrite: false,
      errorOnExist: true
    })).rejects.toThrow('\'src/existing.js\' already exists')
  })
})
