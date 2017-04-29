# rollup-plugin-copy

*Very* basic rollup plugin to copy static assets over to you public directory. Files are copied using [fs-extra.copy](https://github.com/jprichardson/node-fs-extra/blob/master/docs/copy.md) 

## Installation

This package can be installed using npm:

```
npm install rollup-copy-plugin
```

## Usage

Add the following lines to your `rollup.config.js`:

```javascript
import copy from 'rollup-plugin-copy';

...

export default {
    ...
    plugins: [
        ...
        copy({
            "src/index.html": "dist/index.html",
            "node_modules/bootstrap/dist": "dist/vendor/bootstrap",
            "node_modules/font-awesome": "dist/vendor/font-awesome",
            verbose: true
        })
        ...
    ]
    ...
}
```

## Options

* `verbose`: `<boolean>` : display verbose message  (default is `false`)

