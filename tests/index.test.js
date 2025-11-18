import path from 'node:path'
import assert from 'node:assert/strict'
import { afterEach, before, describe, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { bold, green, yellow, options } from 'colorette'
import fs from 'fs-extra'
import replace from 'replace-in-file'
import { rollup, watch } from 'rollup'
import copy from '../src/index.js'

before(() => {
  process.chdir(new URL('./fixtures', import.meta.url).pathname);
  options.enabled = true
})

function readFile(filePath) {
  return fs.readFile(filePath, 'utf-8')
}

async function build(pluginOptions) {
  await rollup({
    input: 'src/index.js',
    plugins: [
      copy(pluginOptions)
    ]
  })
}

afterEach(async () => {
  await fs.remove('build')
  await fs.remove('dist')
})

describe('Copy', () => {
  test('No config passed', async () => {
    await build()

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), false)
  })

  test('Empty array as target', async () => {
    await build({
      targets: []
    })

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), false)
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

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), true)
    assert.strictEqual(await fs.pathExists('dist/asset-2.js'), true)
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

    assert.strictEqual(await fs.pathExists('dist/css'), true)
    assert.strictEqual(await fs.pathExists('dist/css/css-1.css'), true)
    assert.strictEqual(await fs.pathExists('dist/css/css-2.css'), true)
    assert.strictEqual(await fs.pathExists('dist/scss'), true)
    assert.strictEqual(await fs.pathExists('dist/scss/scss-1.scss'), true)
    assert.strictEqual(await fs.pathExists('dist/scss/scss-2.scss'), true)
    assert.strictEqual(await fs.pathExists('dist/scss/nested'), true)
    assert.strictEqual(await fs.pathExists('dist/scss/nested/scss-3.scss'), true)
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

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), true)
    assert.strictEqual(await fs.pathExists('dist/asset-2.js'), true)
    assert.strictEqual(await fs.pathExists('dist/css-1.css'), false)
    assert.strictEqual(await fs.pathExists('dist/css-2.css'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-1.scss'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-2.scss'), false)
  })

  test('Multiple objects as targets', async () => {
    await build({
      targets: [
        { src: ['src/assets/*', 'src/assets/css'], dest: 'dist' },
        { src: 'src/assets/css/*.css', dest: 'build' }
      ]
    })

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), true)
    assert.strictEqual(await fs.pathExists('dist/asset-2.js'), true)
    assert.strictEqual(await fs.pathExists('dist/css'), true)
    assert.strictEqual(await fs.pathExists('dist/css/css-1.css'), true)
    assert.strictEqual(await fs.pathExists('dist/css/css-2.css'), true)
    assert.strictEqual(await fs.pathExists('build/css-1.css'), true)
    assert.strictEqual(await fs.pathExists('build/css-2.css'), true)
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

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), true)
    assert.strictEqual(await fs.pathExists('dist/css'), true)
    assert.strictEqual(await fs.pathExists('dist/css/css-1.css'), true)
    assert.strictEqual(await fs.pathExists('dist/css/css-2.css'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-1.scss'), true)
    assert.strictEqual(await fs.pathExists('build/asset-1.js'), true)
    assert.strictEqual(await fs.pathExists('build/css'), true)
    assert.strictEqual(await fs.pathExists('build/css/css-1.css'), true)
    assert.strictEqual(await fs.pathExists('build/css/css-2.css'), true)
    assert.strictEqual(await fs.pathExists('build/scss-1.scss'), true)
  })

  test('Same target', async () => {
    await build({
      targets: [
        { src: 'src/assets/css', dest: 'dist' },
        { src: 'src/assets/css', dest: 'dist' },
        { src: ['src/assets/asset-1.js', 'src/assets/asset-1.js'], dest: 'build' }
      ]
    })

    assert.strictEqual(await fs.pathExists('dist/css'), true)
    assert.strictEqual(await fs.pathExists('dist/css/css-1.css'), true)
    assert.strictEqual(await fs.pathExists('dist/css/css-2.css'), true)
    assert.strictEqual(await fs.pathExists('build/asset-1.js'), true)
  })

  test('Throw if target is not an object', async () => {
    await assert.rejects(
      build({
        targets: [
          'src/assets/asset-1.js'
        ]
      }),
      { message: '\'src/assets/asset-1.js\' target must be an object' }
    )
  })

  test('Throw if target object doesn\'t have required properties', async () => {
    await assert.rejects(
      build({
        targets: [
          { src: 'src/assets/asset-1.js' }
        ]
      }),
      { message: '{ src: \'src/assets/asset-1.js\' } target must have "src" and "dest" properties' }
    )
  })

  test('Throw if target object "rename" property is of wrong type', async () => {
    await assert.rejects(
      build({
        targets: [
          { src: 'src/assets/asset-1.js', dest: 'dist', rename: [] }
        ]
      }),
      { message: '{ src: \'src/assets/asset-1.js\', dest: \'dist\', rename: [] } target\'s "rename" property must be a string or a function' }
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
          rename: (name) => `${name}-renamed`
        },
        {
          src: 'src/assets/scss/*',
          dest: 'dist/scss-multiple',
          rename: (name, extension) => (
            extension
              ? `${name}-renamed.${extension}`
              : `${name}-renamed`
          )
        },
        {
          src: 'src/assets/asset-1.js',
          dest: 'dist',
          rename: (_, __, fullPath) => path.basename(fullPath).replace(1, 3)
        }
      ]
    })

    assert.strictEqual(await fs.pathExists('dist/asset-1-renamed.js'), true)
    assert.strictEqual(await fs.pathExists('dist/css-renamed'), true)
    assert.strictEqual(await fs.pathExists('dist/css-renamed/css-1.css'), true)
    assert.strictEqual(await fs.pathExists('dist/css-renamed/css-2.css'), true)
    assert.strictEqual(await fs.pathExists('dist/css-multiple/css-1.css'), true)
    assert.strictEqual(await fs.pathExists('dist/css-multiple/css-2.css'), false)
    assert.strictEqual(await fs.pathExists('dist/asset-2-renamed.js'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-renamed'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-renamed/scss-1.scss'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-renamed/scss-2.scss'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-renamed/nested'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-renamed/nested/scss-3.scss'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-multiple/scss-1-renamed.scss'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-multiple/scss-2-renamed.scss'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-multiple/nested-renamed'), true)
    assert.strictEqual(await fs.pathExists('dist/scss-multiple/nested-renamed/scss-3.scss'), true)
    assert.strictEqual(await fs.pathExists('dist/asset-3.js'), true)
  })

  test('Throw if transform target is not a file', async () => {
    await assert.rejects(
      build({
        targets: [{
          src: 'src/assets/css',
          dest: 'dist',
          transform: (contents) => contents.toString().replace('blue', 'red')
        }]
      }),
      { message: '"transform" option works only on files: \'src/assets/css\' must be a file' }
    )
  })

  test('Transform target', async () => {
    await build({
      targets: [
        {
          src: 'src/assets/css/css-1.css',
          dest: ['dist', 'build'],
          transform: (contents) => contents.toString().replace('blue', 'red')
        },
        {
          src: 'src/assets/scss/**/*.scss',
          dest: 'dist',
          transform: (contents) => contents.toString().replace('background-color', 'color')
        },
        {
          src: 'src/assets/css/css-1.css',
          dest: 'dist/css',
          transform: (contents, filename) => (
            contents.toString().replace('blue', filename.replace('ss-1.css', 'oral'))
          )
        }
      ]
    })

    assert.strictEqual(await fs.pathExists('dist/css-1.css'), true)
    assert.match(await readFile('dist/css-1.css'), /red/)
    assert.strictEqual(await fs.pathExists('build/css-1.css'), true)
    assert.match(await readFile('build/css-1.css'), /red/)
    assert.strictEqual(await fs.pathExists('dist/scss-1.scss'), true)
    assert.doesNotMatch(await readFile('dist/scss-1.scss'), /background-color/)
    assert.strictEqual(await fs.pathExists('dist/scss-2.scss'), true)
    assert.doesNotMatch(await readFile('dist/scss-2.scss'), /background-color/)
    assert.strictEqual(await fs.pathExists('dist/scss-3.scss'), true)
    assert.doesNotMatch(await readFile('dist/scss-3.scss'), /background-color/)
    assert.strictEqual(await fs.pathExists('dist/css/css-1.css'), true)
    assert.match(await readFile('dist/css/css-1.css'), /coral/)
  })
})

describe('Options', () => {
  test('Verbose, copy files', async ({ mock }) => {
    mock.method(console, 'log')

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

    assert.strictEqual(console.log.mock.callCount(), 5)
    assert.strictEqual(console.log.mock.calls[0].arguments[0], green('copied:'))
    assert.strictEqual(console.log.mock.calls[1].arguments[0], green(`  ${bold('src/assets/asset-1.js')} → ${bold('dist/asset-1.js')}`))
    assert.strictEqual(console.log.mock.calls[2].arguments[0], green(`  ${bold('src/assets/css/css-1.css')} → ${bold('dist/css-1.css')}`))
    assert.strictEqual(console.log.mock.calls[3].arguments[0], green(`  ${bold('src/assets/css/css-2.css')} → ${bold('dist/css-2.css')}`))
    assert.strictEqual(console.log.mock.calls[4].arguments[0], green(`  ${bold('src/assets/scss')} → ${bold('dist/scss')}`))
  })

  test('Verbose, no files to copy', async ({ mock }) => {
    mock.method(console, 'log')

    await build({
      targets: [
        { src: 'src/not-exist', dest: 'dist' }
      ],
      verbose: true
    })

    assert.strictEqual(console.log.mock.callCount(), 1)
    assert.strictEqual(console.log.mock.calls[0].arguments[0], yellow('no items to copy'))
  })

  test('Verbose, rename files', async ({ mock }) => {
    mock.method(console, 'log')

    await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist', rename: 'asset-1-renamed.js' },
        {
          src: 'src/assets/scss/*',
          dest: 'dist/scss-multiple',
          rename: (name, extension) => (
            extension
              ? `${name}-renamed.${extension}`
              : `${name}-renamed`
          )
        }
      ],
      verbose: true
    })

    assert.strictEqual(console.log.mock.callCount(), 5)
    assert.strictEqual(console.log.mock.calls[0].arguments[0], green('copied:'))
    assert.strictEqual(console.log.mock.calls[1].arguments[0], `${green(`  ${bold('src/assets/asset-1.js')} → ${bold('dist/asset-1-renamed.js')}`)} ${yellow('[R]')}`)
    assert.strictEqual(console.log.mock.calls[2].arguments[0], `${green(`  ${bold('src/assets/scss/nested')} → ${bold('dist/scss-multiple/nested-renamed')}`)} ${yellow('[R]')}`)
    assert.strictEqual(console.log.mock.calls[3].arguments[0], `${green(`  ${bold('src/assets/scss/scss-1.scss')} → ${bold('dist/scss-multiple/scss-1-renamed.scss')}`)} ${yellow('[R]')}`)
    assert.strictEqual(console.log.mock.calls[4].arguments[0], `${green(`  ${bold('src/assets/scss/scss-2.scss')} → ${bold('dist/scss-multiple/scss-2-renamed.scss')}`)} ${yellow('[R]')}`)
  })

  test('Verbose, transform files', async ({ mock }) => {
    mock.method(console, 'log')

    await build({
      targets: [{
        src: 'src/assets/css/css-*.css',
        dest: 'dist',
        transform: (contents) => contents.toString().replace('background-color', 'color')
      }],
      verbose: true
    })

    assert.strictEqual(console.log.mock.callCount(), 3)
    assert.strictEqual(console.log.mock.calls[0].arguments[0], green('copied:'))
    assert.strictEqual(console.log.mock.calls[1].arguments[0], `${green(`  ${bold('src/assets/css/css-1.css')} → ${bold('dist/css-1.css')}`)} ${yellow('[T]')}`)
    assert.strictEqual(console.log.mock.calls[2].arguments[0], `${green(`  ${bold('src/assets/css/css-2.css')} → ${bold('dist/css-2.css')}`)} ${yellow('[T]')}`)
  })

  test('Hook', async () => {
    await build({
      targets: [{
        src: ['src/assets/asset-1.js', 'src/assets/css'],
        dest: 'dist'
      }],
      hook: 'buildStart'
    })

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), true)
    assert.strictEqual(await fs.pathExists('dist/css'), true)
    assert.strictEqual(await fs.pathExists('dist/css/css-1.css'), true)
    assert.strictEqual(await fs.pathExists('dist/css/css-2.css'), true)
  })

  test('Copy once', async ({ waitFor }) => {
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

    await waitFor(async () => assert.strictEqual(await fs.pathExists('dist/asset-1.js'), true))

    await fs.remove('dist')

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), false)

    await replace({
      files: 'src/index.js',
      from: 'hey',
      to: 'ho'
    })

    await setTimeout(1_000)

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), false)

    watcher.close()

    await replace({
      files: 'src/index.js',
      from: 'ho',
      to: 'hey'
    })
  })

  test('Copy sync', async () => {
    await build({
      targets: [{
        src: [
          'src/assets/asset-1.js',
          'src/assets/asset-2.js'
        ],
        dest: 'dist'
      }],
      copySync: true
    })

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), true)
    assert.strictEqual(await fs.pathExists('dist/asset-2.js'), true)
  })

  test('Flatten', async () => {
    await build({
      targets: [{
        src: [
          'src/assets/asset-1.js',
          'src/assets/asset-2.js'
        ],
        dest: 'dist'
      },
      {
        src: 'src/**/*.css',
        dest: 'dist'
      },
      {
        src: '**/*.scss',
        dest: 'dist',
        rename: (name, extension) => `${name}-renamed.${extension}`
      }],
      flatten: false
    })

    assert.strictEqual(await fs.pathExists('dist/assets/asset-1.js'), true)
    assert.strictEqual(await fs.pathExists('dist/assets/asset-2.js'), true)
    assert.strictEqual(await fs.pathExists('dist/assets/css/css-1.css'), true)
    assert.strictEqual(await fs.pathExists('dist/assets/css/css-2.css'), true)
    assert.strictEqual(await fs.pathExists('dist/assets/scss/scss-1-renamed.scss'), true)
    assert.strictEqual(await fs.pathExists('dist/assets/scss/scss-2-renamed.scss'), true)
    assert.strictEqual(await fs.pathExists('dist/assets/scss/nested/scss-3-renamed.scss'), true)
  })

  test('Rest options', async () => {
    await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist' }
      ],
      ignore: ['**/asset-1.js']
    })

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), false)
  })

  test('Rest target options', async () => {
    await build({
      targets: [
        { src: 'src/assets/asset-1.js', dest: 'dist', ignore: ['**/asset-1.js'] }
      ]
    })

    assert.strictEqual(await fs.pathExists('dist/asset-1.js'), false)
  })
})
