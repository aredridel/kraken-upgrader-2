"use strict";

var util = require('util');
var getConfig = require('kraken-js/lib/config').create;

module.exports = function loadEnvConfig(env, dir) {
    var options = {
        protocols: {},
        onconfig: function () {},
        basedir: dir,
        mountpath: null,
        inheritViews: false
    };
    var oldEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = env;

    return getConfig(options).then(function (conf) {
        process.env.NODE_ENV = oldEnv;
        return {env: env, conf: conf};
    }).then(function(config) {
        var middleware = toNamed(config.conf.get('middleware'));
        return {middleware: middleware, config:  config};
    });

    function toNamed(obj) {
        var out = [];
        for (var k in obj) {
            out.push({name: k, value: obj[k]});
        }

        return out;
    }
}
