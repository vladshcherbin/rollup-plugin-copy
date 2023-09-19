import rollup from 'rollup';
import fs from 'fs-extra';
import globby from 'globby';

interface Target extends globby.GlobbyOptions {
    /**
     * Path or glob of what to copy.
     */
    readonly src: string | readonly string[];

    /**
     * One or more destinations where to copy.
     */
    readonly dest: string | readonly string[];

    /**
     * Change destination file or folder name.
     */
    readonly rename?: string | ((name: string, extension: string, fullPath: string) => string);

    /**
     * Modify file contents.
     */
    readonly transform?: (contents: Buffer, name: string) => any;

	/**
	If set to `true`, `globby` will automatically glob directories for you. If you define an `Array` it will only glob files that matches the patterns inside the `Array`. You can also define an `Object` with `files` and `extensions` like in the example below.

	Note that if you set this option to `false`, you won't get back matched directories unless you set `onlyFiles: false`.

	@default false

	@example
	```
	import {globby} from 'globby';

	const paths = await globby('images', {
		expandDirectories: {
			files: ['cat', 'unicorn', '*.jpg'],
			extensions: ['png']
		}
	});

	console.log(paths);
	//=> ['cat.png', 'unicorn.png', 'cow.jpg', 'rainbow.jpg']
	```
	*/
	readonly expandDirectories?: globby.ExpandDirectoriesOption;

    /**
     * Return only files
     *
     * @default false
     */
    readonly onlyFiles?: boolean;

}

interface CopyOptions extends globby.GlobbyOptions, fs.WriteFileOptions, fs.CopyOptions {
    /**
     * Copy items once. Useful in watch mode.
     * @default false
     */
    readonly copyOnce?: boolean;

    /**
     * Copy items synchronous.
     * @default false
     */
    readonly copySync?: boolean;

    /**
     * Remove the directory structure of copied files.
     * @default true
     */
    readonly flatten?: boolean;

    /**
     * Rollup hook the plugin should use.
     * @default 'buildEnd'
     */
    readonly hook?: string;

    /**
     * Array of targets to copy.
     * @default []
     */
    readonly targets?: readonly Target[];

    /**
     * Output copied items to console.
     * @default false
     */
    readonly verbose?: boolean;
}

/**
 * Copy files and folders using Rollup
 */
export default function copy(options?: CopyOptions): rollup.Plugin;
