
var fse = require("fs-extra");
var colors = require("colors");

function success(name, src, dest) {
    console.log("(" + name + ") '" + src.green + "' -> '" + dest.green + "' (" +  "\u2714".green + ")"); 
}

function fatal(name, src, dest, err) {
    console.error("(" + name + ") '" + src.red + "' -> '" + dest.red + "' (" +  "\u2718".red + ")");
    console.error();
    console.error("    " + err);
    process.exit(err.errno);
}

module.exports = function(options={}) {
    const { verbose=false } = options;
    const name = "rollup-plugin-copy";

    return {
        name: name,
        ongenerate: function(object) {

            for (key in options) {
                if (key == "verbose") continue;
                const src = key;
                const dest = options[key];

                fse.copy(src, dest).then( () => {
                    if (verbose) success(name, src, dest);
                }).catch( (err) => {
                    fatal(name, src, dest, err);
                });
            }

        }
    }
};

