
var fse = require("fs-extra");
var colors = require("colors");

function success(name, src, dest) {
    console.log();
    console.log(name + ": '" + src.green + "' -> '" + dest.green + "' (" +  "\u2714".green + ")");
    console.log();    
}

function fatal(name, src, dest, err) {
    console.error();
    console.error(name + ": '" + src.red + "' -> '" + dest.red + "' (" +  "\u2718".red + ")");
    console.error();
    console.error("    " + err);
    process.exit(-1);
}

function copy(options={}) {
    const { 
        src, 
        dest, 
        verbose=false } = options;
    
    const name = "rollup-plugin-copy";

    return {
        name: name,
        ongenerate: function(object) { 
            fse.copy(src, dest).then( () => {
                if (verbose) success(name, src, dest);
            }).catch( (err) => {
                fatal(name, src, dest, err);
            });
        }
    }
};

export default copy;
