/* eslint-disable @typescript-eslint/ban-ts-comment, perfectionist/sort-objects */
import { pathExists, remove } from 'fs-extra'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { after, afterEach, before, describe, mock, test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { styleText } from 'node:util'
import { replaceInFile } from 'replace-in-file'
import { rollup, watch } from 'rollup'
import copy from '../src/index.ts'
import type Options from '../src/types.ts'

async function build(options?: Options) {
  await rollup({
    input: 'src/index.ts',
    plugins: [
      copy(options)
    ]
  })
}

before(() => {
  process.chdir(`${import.meta.dirname}/fixtures`)
})

afterEach(async () => {
  await remove('build')
  await remove('dist')
})

await describe('Copy', async () => {
  await test('No config passed', async () => {
    await build()

    assert.strictEqual(await pathExists('dist/asset-1.ts'), false)
  })

  await test('Empty array as target', async () => {
    await build({
      targets: []
    })

    assert.strictEqual(await pathExists('dist/asset-1.ts'), false)
  })

  await test('Files', async () => {
    await build({
      targets: [{
        dest: 'dist',
        src: [
          'src/assets/asset-1.ts',
          'src/assets/asset-2.ts'
        ]
      }]
    })

    assert.strictEqual(await pathExists('dist/asset-1.ts'), true)
    assert.strictEqual(await pathExists('dist/asset-2.ts'), true)
  })

  await test('Folders', async () => {
    await build({
      targets: [{
        dest: 'dist',
        src: [
          'src/assets/css',
          'src/assets/scss'
        ]
      }]
    })

    assert.strictEqual(await pathExists('dist/css'), true)
    assert.strictEqual(await pathExists('dist/css/css-1.css'), true)
    assert.strictEqual(await pathExists('dist/css/css-2.css'), true)
    assert.strictEqual(await pathExists('dist/scss'), true)
    assert.strictEqual(await pathExists('dist/scss/scss-1.scss'), true)
    assert.strictEqual(await pathExists('dist/scss/scss-2.scss'), true)
    assert.strictEqual(await pathExists('dist/scss/nested'), true)
    assert.strictEqual(await pathExists('dist/scss/nested/scss-3.scss'), true)
  })

  await test('Glob', async () => {
    await build({
      targets: [{
        dest: 'dist',
        src: [
          'src/assets/asset-{1,2}.ts',
          'src/assets/css/*.css',
          '!**/css-1.css',
          'src/assets/scss/scss-?(1).scss'
        ]
      }]
    })

    assert.strictEqual(await pathExists('dist/asset-1.ts'), true)
    assert.strictEqual(await pathExists('dist/asset-2.ts'), true)
    assert.strictEqual(await pathExists('dist/css-1.css'), false)
    assert.strictEqual(await pathExists('dist/css-2.css'), true)
    assert.strictEqual(await pathExists('dist/scss-1.scss'), true)
    assert.strictEqual(await pathExists('dist/scss-2.scss'), false)
  })

  await test('Multiple objects as targets', async () => {
    await build({
      targets: [
        { dest: 'dist', src: ['src/assets/*', 'src/assets/css'] },
        { dest: 'build', src: 'src/assets/css/*.css' }
      ]
    })

    assert.strictEqual(await pathExists('dist/asset-1.ts'), true)
    assert.strictEqual(await pathExists('dist/asset-2.ts'), true)
    assert.strictEqual(await pathExists('dist/css'), true)
    assert.strictEqual(await pathExists('dist/css/css-1.css'), true)
    assert.strictEqual(await pathExists('dist/css/css-2.css'), true)
    assert.strictEqual(await pathExists('build/css-1.css'), true)
    assert.strictEqual(await pathExists('build/css-2.css'), true)
  })

  await test('Multiple destinations', async () => {
    await build({
      targets: [{
        dest: ['dist', 'build'],
        src: [
          'src/assets/asset-1.ts',
          'src/assets/css',
          'src/assets/scss/scss-?(1).scss'
        ]
      }]
    })

    assert.strictEqual(await pathExists('dist/asset-1.ts'), true)
    assert.strictEqual(await pathExists('dist/css'), true)
    assert.strictEqual(await pathExists('dist/css/css-1.css'), true)
    assert.strictEqual(await pathExists('dist/css/css-2.css'), true)
    assert.strictEqual(await pathExists('dist/scss-1.scss'), true)
    assert.strictEqual(await pathExists('build/asset-1.ts'), true)
    assert.strictEqual(await pathExists('build/css'), true)
    assert.strictEqual(await pathExists('build/css/css-1.css'), true)
    assert.strictEqual(await pathExists('build/css/css-2.css'), true)
    assert.strictEqual(await pathExists('build/scss-1.scss'), true)
  })

  await test('Same target', async () => {
    await build({
      targets: [
        { dest: 'dist', src: 'src/assets/css' },
        { dest: 'dist', src: 'src/assets/css' },
        { dest: 'build', src: ['src/assets/asset-1.ts', 'src/assets/asset-1.ts'] }
      ]
    })

    assert.strictEqual(await pathExists('dist/css'), true)
    assert.strictEqual(await pathExists('dist/css/css-1.css'), true)
    assert.strictEqual(await pathExists('dist/css/css-2.css'), true)
    assert.strictEqual(await pathExists('build/asset-1.ts'), true)
  })

  await test('Throw if target is not an object', async () => {
    await assert.rejects(
      build({
        targets: [
          // @ts-expect-error
          'src/assets/asset-1.ts'
        ]
      }),
      { message: '\'src/assets/asset-1.ts\' target must be an object' }
    )
  })

  await test('Throw if target object doesn\'t have required properties', async () => {
    await assert.rejects(
      build({
        targets: [
          // @ts-expect-error
          { src: 'src/assets/asset-1.ts' }
        ]
      }),
      { message: '{ src: \'src/assets/asset-1.ts\' } target must have "src" and "dest" properties' }
    )
  })

  await test('Throw if target object "rename" property is of wrong type', async () => {
    await assert.rejects(
      build({
        targets: [
          // @ts-expect-error

          { src: 'src/assets/asset-1.ts', dest: 'dist', rename: [] }
        ]
      }),
      { message: '{ src: \'src/assets/asset-1.ts\', dest: \'dist\', rename: [] } target\'s "rename" property must be a string or a function' }
    )
  })

  await test('Rename target', async () => {
    await build({
      targets: [
        { src: 'src/assets/asset-1.ts', dest: 'dist', rename: 'asset-1-renamed.ts' },
        { src: 'src/assets/css', dest: 'dist', rename: 'css-renamed' },
        { src: 'src/assets/css/*', dest: 'dist/css-multiple', rename: 'css-1.css' },
        {
          src: 'src/assets/asset-2.ts',
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
          src: 'src/assets/asset-1.ts',
          dest: 'dist',
          rename: (name, extension, fullPath) => basename(fullPath).replace('1', '3')
        }
      ]
    })

    assert.strictEqual(await pathExists('dist/asset-1-renamed.ts'), true)
    assert.strictEqual(await pathExists('dist/css-renamed'), true)
    assert.strictEqual(await pathExists('dist/css-renamed/css-1.css'), true)
    assert.strictEqual(await pathExists('dist/css-renamed/css-2.css'), true)
    assert.strictEqual(await pathExists('dist/css-multiple/css-1.css'), true)
    assert.strictEqual(await pathExists('dist/css-multiple/css-2.css'), false)
    assert.strictEqual(await pathExists('dist/asset-2-renamed.ts'), true)
    assert.strictEqual(await pathExists('dist/scss-renamed'), true)
    assert.strictEqual(await pathExists('dist/scss-renamed/scss-1.scss'), true)
    assert.strictEqual(await pathExists('dist/scss-renamed/scss-2.scss'), true)
    assert.strictEqual(await pathExists('dist/scss-renamed/nested'), true)
    assert.strictEqual(await pathExists('dist/scss-renamed/nested/scss-3.scss'), true)
    assert.strictEqual(await pathExists('dist/scss-multiple/scss-1-renamed.scss'), true)
    assert.strictEqual(await pathExists('dist/scss-multiple/scss-2-renamed.scss'), true)
    assert.strictEqual(await pathExists('dist/scss-multiple/nested-renamed'), true)
    assert.strictEqual(await pathExists('dist/scss-multiple/nested-renamed/scss-3.scss'), true)
    assert.strictEqual(await pathExists('dist/asset-3.ts'), true)
  })

  await test('Throw if transform target is not a file', async () => {
    await assert.rejects(
      build({
        targets: [{
          dest: 'dist',
          src: 'src/assets/css',
          transform: (contents) => contents.toString().replace('blue', 'red')
        }]
      }),
      { message: '"transform" option works only on files: \'src/assets/css\' must be a file' }
    )
  })

  await test('Transform target', async () => {
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

    assert.strictEqual(await pathExists('dist/css-1.css'), true)
    assert.match(await readFile('dist/css-1.css', 'utf-8'), /red/)
    assert.strictEqual(await pathExists('build/css-1.css'), true)
    assert.match(await readFile('build/css-1.css', 'utf-8'), /red/)
    assert.strictEqual(await pathExists('dist/scss-1.scss'), true)
    assert.doesNotMatch(await readFile('dist/scss-1.scss', 'utf-8'), /background-color/)
    assert.strictEqual(await pathExists('dist/scss-2.scss'), true)
    assert.doesNotMatch(await readFile('dist/scss-2.scss', 'utf-8'), /background-color/)
    assert.strictEqual(await pathExists('dist/scss-3.scss'), true)
    assert.doesNotMatch(await readFile('dist/scss-3.scss', 'utf-8'), /background-color/)
    assert.strictEqual(await pathExists('dist/css/css-1.css'), true)
    assert.match(await readFile('dist/css/css-1.css', 'utf-8'), /coral/)
  })
})

await describe('Options', async () => {
  const log = mock.method(console, 'log', () => null)

  afterEach(() => {
    log.mock.resetCalls()
  })

  after(() => {
    mock.reset()
  })

  await test('Verbose, copy files', async () => {
    await build({
      targets: [{
        dest: 'dist',
        src: [
          'src/assets/asset-1.ts',
          'src/assets/css/*',
          'src/assets/scss',
          'src/not-exist'
        ]
      }],
      verbose: true
    })

    assert.strictEqual(log.mock.callCount(), 5)
    assert.strictEqual(log.mock.calls[0]!.arguments[0], styleText('green', 'copied:'))
    assert.strictEqual(log.mock.calls[1]!.arguments[0], styleText('green', `  ${styleText('bold', 'src/assets/asset-1.ts')} → ${styleText('bold', 'dist/asset-1.ts')}`))
    assert.strictEqual(log.mock.calls[2]!.arguments[0], styleText('green', `  ${styleText('bold', 'src/assets/scss')} → ${styleText('bold', 'dist/scss')}`))
    assert.strictEqual(log.mock.calls[3]!.arguments[0], styleText('green', `  ${styleText('bold', 'src/assets/css/css-1.css')} → ${styleText('bold', 'dist/css-1.css')}`))
    assert.strictEqual(log.mock.calls[4]!.arguments[0], styleText('green', `  ${styleText('bold', 'src/assets/css/css-2.css')} → ${styleText('bold', 'dist/css-2.css')}`))
  })

  await test('Verbose, no files to copy', async () => {
    await build({
      targets: [
        { dest: 'dist', src: 'src/not-exist' }
      ],
      verbose: true
    })

    assert.strictEqual(log.mock.callCount(), 1)
    assert.strictEqual(log.mock.calls[0]!.arguments[0], styleText('yellow', 'no items to copy'))
  })

  await test('Verbose, rename files', async () => {
    await build({
      targets: [

        { src: 'src/assets/asset-1.ts', dest: 'dist', rename: 'asset-1-renamed.ts' },
        {
          dest: 'dist/scss-multiple',
          rename: (name, extension) => (
            extension
              ? `${name}-renamed.${extension}`
              : `${name}-renamed`
          ),
          src: 'src/assets/scss/*'
        }
      ],
      verbose: true
    })

    assert.strictEqual(log.mock.callCount(), 5)
    assert.strictEqual(log.mock.calls[0]!.arguments[0], styleText('green', 'copied:'))
    assert.strictEqual(log.mock.calls[1]!.arguments[0], `${styleText('green', `  ${styleText('bold', 'src/assets/asset-1.ts')} → ${styleText('bold', 'dist/asset-1-renamed.ts')}`)} ${styleText('yellow', '[R]')}`)
    assert.strictEqual(log.mock.calls[2]!.arguments[0], `${styleText('green', `  ${styleText('bold', 'src/assets/scss/nested')} → ${styleText('bold', 'dist/scss-multiple/nested-renamed')}`)} ${styleText('yellow', '[R]')}`)
    assert.strictEqual(log.mock.calls[3]!.arguments[0], `${styleText('green', `  ${styleText('bold', 'src/assets/scss/scss-1.scss')} → ${styleText('bold', 'dist/scss-multiple/scss-1-renamed.scss')}`)} ${styleText('yellow', '[R]')}`)
    assert.strictEqual(log.mock.calls[4]!.arguments[0], `${styleText('green', `  ${styleText('bold', 'src/assets/scss/scss-2.scss')} → ${styleText('bold', 'dist/scss-multiple/scss-2-renamed.scss')}`)} ${styleText('yellow', '[R]')}`)
  })

  await test('Verbose, transform files', async () => {
    await build({
      targets: [{
        src: 'src/assets/css/css-*.css',
        dest: 'dist',
        transform: (contents) => contents.toString().replace('background-color', 'color')
      }],
      verbose: true
    })

    assert.strictEqual(log.mock.callCount(), 3)
    assert.strictEqual(log.mock.calls[0]!.arguments[0], styleText('green', 'copied:'))
    assert.strictEqual(log.mock.calls[1]!.arguments[0], `${styleText('green', `  ${styleText('bold', 'src/assets/css/css-1.css')} → ${styleText('bold', 'dist/css-1.css')}`)} ${styleText('yellow', '[T]')}`)
    assert.strictEqual(log.mock.calls[2]!.arguments[0], `${styleText('green', `  ${styleText('bold', 'src/assets/css/css-2.css')} → ${styleText('bold', 'dist/css-2.css')}`)} ${styleText('yellow', '[T]')}`)
  })

  await test('Hook', async () => {
    await build({
      hook: 'buildStart',
      targets: [{
        dest: 'dist',
        src: ['src/assets/asset-1.ts', 'src/assets/css']
      }]
    })

    assert.strictEqual(await pathExists('dist/asset-1.ts'), true)
    assert.strictEqual(await pathExists('dist/css'), true)
    assert.strictEqual(await pathExists('dist/css/css-1.css'), true)
    assert.strictEqual(await pathExists('dist/css/css-2.css'), true)
  })

  await test('Copy once', async () => {
    const watcher = watch({
      input: 'src/index.ts',
      output: {
        dir: 'build',
        format: 'esm'
      },
      plugins: [
        copy({
          targets: [
            { src: 'src/assets/asset-1.ts', dest: 'dist' }
          ],
          copyOnce: true
        })
      ]
    })

    await setTimeout(500)

    assert.strictEqual(await pathExists('dist/asset-1.ts'), true)

    await remove('dist')

    assert.strictEqual(await pathExists('dist/asset-1.ts'), false)

    await replaceInFile({
      files: 'src/index.ts',
      from: 'hey',
      to: 'ho'
    })

    await setTimeout(500)

    assert.strictEqual(await pathExists('dist/asset-1.ts'), false)

    await watcher.close()

    await replaceInFile({
      files: 'src/index.ts',
      from: 'ho',
      to: 'hey'
    })
  })

  await test('Copy sync', async () => {
    await build({
      copySync: true,
      targets: [{
        dest: 'dist',
        src: [
          'src/assets/asset-1.ts',
          'src/assets/asset-2.ts'
        ]
      }]
    })

    assert.strictEqual(await pathExists('dist/asset-1.ts'), true)
    assert.strictEqual(await pathExists('dist/asset-2.ts'), true)
  })

  await test('Flatten', async () => {
    await build({
      flatten: false,
      targets: [{
        src: [
          'src/assets/asset-1.ts',
          'src/assets/asset-2.ts'
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
      }]
    })

    assert.strictEqual(await pathExists('dist/assets/asset-1.ts'), true)
    assert.strictEqual(await pathExists('dist/assets/asset-2.ts'), true)
    assert.strictEqual(await pathExists('dist/assets/css/css-1.css'), true)
    assert.strictEqual(await pathExists('dist/assets/css/css-2.css'), true)
    assert.strictEqual(await pathExists('dist/assets/scss/scss-1-renamed.scss'), true)
    assert.strictEqual(await pathExists('dist/assets/scss/scss-2-renamed.scss'), true)
    assert.strictEqual(await pathExists('dist/assets/scss/nested/scss-3-renamed.scss'), true)
  })

  await test('Rest options', async () => {
    await build({
      ignore: ['**/asset-1.ts'],
      targets: [
        { src: 'src/assets/asset-1.ts', dest: 'dist' }
      ]
    })

    assert.strictEqual(await pathExists('dist/asset-1.ts'), false)
  })

  await test('Rest target options', async () => {
    await build({
      targets: [
        { src: 'src/assets/asset-1.ts', dest: 'dist', ignore: ['**/asset-1.ts'] }
      ]
    })

    assert.strictEqual(await pathExists('dist/asset-1.ts'), false)
  })
})
