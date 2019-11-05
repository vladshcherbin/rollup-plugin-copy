import { rollup, watch } from 'rollup'
import fs from 'fs-extra'
import replace from 'replace-in-file'
import { bold, yellow, green } from 'colorette'
import { join } from 'path'
import copy from '../src'

process.chdir(`${__dirname}/fixtures`)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

afterEach(async () => {
  await fs.remove('build')
  await fs.remove('dist')
})

async function build(options) {
  const copyPlugin = copy(options)
  await rollup({
    input: 'src/index.js',
    plugins: [
      copyPlugin
    ]
  })
  return copyPlugin
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

  test('Multiple destinations', async () => {
    await build({
      targets: [{
        src: [
          'src/assets/asset-1.js',
          'src/assets/css',
          'src/assets/scss/scss-?(1).scss'
        ],
        dest: ['dist', 'build']
      }]
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-1.css')).toBe(true)
    expect(await fs.pathExists('dist/css/css-2.css')).toBe(true)
    expect(await fs.pathExists('dist/scss-1.scss')).toBe(true)
    expect(await fs.pathExists('build/asset-1.js')).toBe(true)
    expect(await fs.pathExists('build/css')).toBe(true)
    expect(await fs.pathExists('build/css/css-1.css')).toBe(true)
    expect(await fs.pathExists('build/css/css-2.css')).toBe(true)
    expect(await fs.pathExists('build/scss-1.scss')).toBe(true)
  })

  test('Same target', async () => {
    await build({
      targets: [
        { src: 'src/assets/css', dest: 'dist' },
        { src: 'src/assets/css', dest: 'dist' },
        { src: ['src/assets/asset-1.js', 'src/assets/asset-1.js'], dest: 'build' }
      ]
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
    })).rejects.toThrow('\'src/assets/asset-1.js\' target must be an object')
  })

  test('Throw if target object doesn\'t have required properties', async () => {
    await expect(build({
      targets: [
        { src: 'src/assets/asset-1.js' }
      ]
    }))
      .rejects
      .toThrow('{ src: \'src/assets/asset-1.js\' } target must have "src" and "dest" properties')
  })

  test('Throw if target object "rename" property is of wrong type', async () => {
    await expect(build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist', rename: [] }
      ]
    }))
      .rejects
      .toThrow(
        '{ src: \'src/assets/asset-1.js\', dest: \'dist\', rename: [] }'
        + ' target\'s "rename" property must be a string or a function'
      )
  })

  test('Rename target', async () => {
    await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist', rename: 'asset-1-renamed.js' },
        { src: 'src/assets/css', dest: 'dist', rename: 'css-renamed' },
        { src: 'src/assets/css/*', dest: 'dist/css-multiple', rename: 'css-1.css' },
        {
          src: 'src/assets/asset-2.js',
          dest: 'dist',
          rename: (name, extension) => `${name}-renamed.${extension}`
        },
        {
          src: 'src/assets/scss',
          dest: 'dist',
          rename: name => `${name}-renamed`
        },
        {
          src: 'src/assets/scss/*',
          dest: 'dist/scss-multiple',
          rename: (name, extension) => (
            extension
              ? `${name}-renamed.${extension}`
              : `${name}-renamed`
          )
        }
      ]
    })

    expect(await fs.pathExists('dist/asset-1-renamed.js')).toBe(true)
    expect(await fs.pathExists('dist/css-renamed')).toBe(true)
    expect(await fs.pathExists('dist/css-renamed/css-1.css')).toBe(true)
    expect(await fs.pathExists('dist/css-renamed/css-2.css')).toBe(true)
    expect(await fs.pathExists('dist/css-multiple/css-1.css')).toBe(true)
    expect(await fs.pathExists('dist/css-multiple/css-2.css')).toBe(false)
    expect(await fs.pathExists('dist/asset-2-renamed.js')).toBe(true)
    expect(await fs.pathExists('dist/scss-renamed')).toBe(true)
    expect(await fs.pathExists('dist/scss-renamed/scss-1.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss-renamed/scss-2.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss-renamed/nested')).toBe(true)
    expect(await fs.pathExists('dist/scss-renamed/nested/scss-3.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss-multiple/scss-1-renamed.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss-multiple/scss-2-renamed.scss')).toBe(true)
    expect(await fs.pathExists('dist/scss-multiple/nested-renamed')).toBe(true)
    expect(await fs.pathExists('dist/scss-multiple/nested-renamed/scss-3.scss')).toBe(true)
  })
})

describe('Watching', () => {
  test('Does not watch target files when watch mode disabled', async () => {
    await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist' }
      ]
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    await fs.remove('dist')
    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)

    await replace({
      files: 'src/assets/asset-1.js',
      from: 'asset1',
      to: 'assetX'
    })

    await sleep(1000)

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)

    await replace({
      files: 'src/assets/asset-1.js',
      from: 'assetX',
      to: 'asset1'
    })
  })

  test('Does not watch target files when watch mode and copyOnce enabled', async () => {
    process.env.ROLLUP_WATCH = 'true'
    await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist' }
      ],
      copyOnce: true
    })
    delete process.env.ROLLUP_WATCH

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    await fs.remove('dist')
    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)

    await replace({
      files: 'src/assets/asset-1.js',
      from: 'asset1',
      to: 'assetX'
    })

    await sleep(1000)

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)

    await replace({
      files: 'src/assets/asset-1.js',
      from: 'assetX',
      to: 'asset1'
    })
  })

  test('Watches target files when watch mode enabled', async () => {
    process.env.ROLLUP_WATCH = 'true'
    const copyPlugin = await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist' }
      ]
    })
    delete process.env.ROLLUP_WATCH

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    await fs.remove('dist')
    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)

    await replace({
      files: 'src/assets/asset-1.js',
      from: 'asset1',
      to: 'assetX'
    })

    await sleep(1000)

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)

    // eslint-disable-next-line no-underscore-dangle
    await copyPlugin._closeWatchers()

    await replace({
      files: 'src/assets/asset-1.js',
      from: 'assetX',
      to: 'asset1'
    })
  })

  test('Watches and copies multiple targets from same file', async () => {
    process.env.ROLLUP_WATCH = 'true'
    const copyPlugin = await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist' },
        { src: 'src/assets/asset-1.js', dest: 'dist/2' }
      ]
    })
    delete process.env.ROLLUP_WATCH

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/2/asset-1.js')).toBe(true)
    await fs.remove('dist')
    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)
    expect(await fs.pathExists('dist/2/asset-1.js')).toBe(false)

    await replace({
      files: 'src/assets/asset-1.js',
      from: 'asset1',
      to: 'assetX'
    })

    await sleep(1000)

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)
    expect(await fs.pathExists('dist/2/asset-1.js')).toBe(true)

    // eslint-disable-next-line no-underscore-dangle
    await copyPlugin._closeWatchers()

    await replace({
      files: 'src/assets/asset-1.js',
      from: 'assetX',
      to: 'asset1'
    })
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
    expect(console.log).toHaveBeenCalledWith(green('copied:'))
    expect(console.log).toHaveBeenCalledWith(
      green(`  ${bold('src/assets/asset-1.js')} → ${bold(join('dist', 'asset-1.js'))}`)
    )
    expect(console.log).toHaveBeenCalledWith(
      green(`  ${bold('src/assets/css/css-1.css')} → ${bold(join('dist', 'css-1.css'))}`)
    )
    expect(console.log).toHaveBeenCalledWith(
      green(`  ${bold('src/assets/css/css-2.css')} → ${bold(join('dist', 'css-2.css'))}`)
    )
    expect(console.log).toHaveBeenCalledWith(
      green(`  ${bold('src/assets/scss')} → ${bold(join('dist', 'scss'))}`)
    )
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
    expect(console.log).toHaveBeenCalledWith(yellow('no items to copy'))
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

  test('Copy once', async () => {
    const watcher = watch({
      input: 'src/index.js',
      output: {
        dir: 'build',
        format: 'esm'
      },
      plugins: [
        copy({
          targets: [
            { src: 'src/assets/asset-1.js', dest: 'dist' }
          ],
          copyOnce: true
        })
      ]
    })

    await sleep(1000)

    expect(await fs.pathExists('dist/asset-1.js')).toBe(true)

    await fs.remove('dist')

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)

    await replace({
      files: 'src/index.js',
      from: 'hey',
      to: 'ho'
    })

    await sleep(1000)

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)

    watcher.close()

    await replace({
      files: 'src/index.js',
      from: 'ho',
      to: 'hey'
    })
  })

  test('Rest options', async () => {
    await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist' }
      ],
      ignore: ['**/asset-1.js']
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)
  })

  test('Rest target options', async () => {
    await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist', ignore: ['**/asset-1.js'] }
      ]
    })

    expect(await fs.pathExists('dist/asset-1.js')).toBe(false)
  })
})
