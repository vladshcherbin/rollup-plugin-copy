
var fse = require("fs-extra");

function copy(options) {
    const { src, dest } = options;
    return {
        name: "rollup-copyfile-plugin",
        transform: function() { 
            fs.copy(src, dest, err => {
                if (err) return this.error(err)
            })
        }
    }
};

export default copy;
