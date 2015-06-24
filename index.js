"use strict";

var getConfig = require('kraken-js/lib/config').create;
var util = require('util');
var fs = require('fs');
var path = require('path');
var VError = require('verror');
var semver = require('semver');

module.exports = function checkUpgrade(dir, cb) {
    var options = {
        protocols: {},
        onconfig: function () {},
        basedir: dir,
        mountpath: null,
        inheritViews: false
    };

    fs.readFile(path.resolve(options.basedir, 'package.json'), 'utf-8', function (err, pkg) {
        if (err) {
            return cb(err);
        }

        try {
            var info = JSON.parse(pkg);
            if (!semver.satisfies('1.0.5', info.dependencies['kraken-js'])) {
                return cb(new VError("package '%s' does not depend on kraken-js 1.0 and cannot be upgraded", info.name));
            }
        } catch (e) {
            return cb(e);
        }

        getConfig(options).then(function (config) {
            var middleware = toNamed(config.get('middleware'));
            return middleware.filter(function (e) {
                return !('enabled' in e.value);
            }).map(function (e) {
                return util.format("Middleware '%s' was not enabled before, but was not explicitly disabled. Add `\"enabled\": false` to its configuration to keep existing behavior.", e.name);
            }).concat(middleware.filter(function (e) {
                return e.value === "kraken-js/middleware/404" ||
                    (e.value.module && e.value.module.name === 'kraken-js/middleware/404') ||
                    e.value === "kraken-js/middleware/500" ||
                    (e.value.module && e.value.module.name === 'kraken-js/middleware/500');
            }).map(function (e) {
                return util.format("Middleware '%s' is deprecated. You should probably just remove it and let the defaults in Express work.", e.name);
            }));
        }).then(function (messages) {
            cb(null, messages);
        }).catch(cb);
    });
};

function toNamed(obj) {
    var out = [];
    for (var k in obj) {
        out.push({name: k, value: obj[k]});
    }

    return out;
}
