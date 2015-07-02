module.exports = function toNamed(obj) {
    var out = [];
    for (var k in obj) {
        out.push({name: k, value: obj[k]});
    }

    return out;
}
