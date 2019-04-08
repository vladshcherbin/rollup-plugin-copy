# rollup-plugin-copy

[![Build Status](https://travis-ci.org/vladshcherbin/rollup-plugin-copy.svg?branch=master)](https://travis-ci.org/vladshcherbin/rollup-plugin-copy)
[![Codecov](https://codecov.io/gh/vladshcherbin/rollup-plugin-copy/branch/master/graph/badge.svg)](https://codecov.io/gh/vladshcherbin/rollup-plugin-copy)

Copy files and folders using Rollup.

## About

This plugin is useful when you want to copy some files or folders before bundling.

## Installation

```bash
yarn add rollup-plugin-copy -D

# or

npm install rollup-plugin-copy --save-dev
```

## Usage

```js
// rollup.config.js
import copy from 'rollup-plugin-copy'

export default {
  input: 'src/index.js',
  output: {
    file: 'dist/app.js',
    format: 'cjs'
  },
  plugins: [
    copy({
      targets: [
        'src/migrations',
        'src/index.html'
      ]
    })
  ]
}
```

### Configuration

There are some useful options, all of them are optional:

#### targets

An array or an object with paths of files and folders to be copied. Default is `[]`.

```js
copy({
  targets: ['src/assets', 'src/index.html']
})

copy({
  targets: {
    'src/assets': 'dist/public/assets',
    'src/index.html': 'dist/public/index.html',
    'src/migrations': 'dist/migrations'
  }
})
```

#### outputFolder

Folder where files and folders will be copied. By default, bundle output folder is used.

```js
copy({
  targets: ['src/assets', 'src/index.html'],
  outputFolder: 'dist/public'
})
```

> Note: only used when *targets* is an array

#### verbose

Output copied files and folders to console. Default is `false`.

```js
copy({
  targets: ['src/assets', 'src/index.html'],
  verbose: true
})
```

#### warnOnNonExist

Warn if target file or folder doesn't exist. Default is `false`.

```js
copy({
  targets: ['src/assets', 'src/index.html'],
  warnOnNonExist: true
})
```

All other options are passed directly to [fs-extra copy function](https://github.com/jprichardson/node-fs-extra/blob/7.0.0/docs/copy.md), which is used inside.

## Original Author

[Cédric Meuter](https://github.com/meuter)

## License

MIT
