"use strict";

var getConfig = require('kraken-js/lib/config').create;
var util = require('util');
var path = require('path');
var VError = require('verror');
var semver = require('semver');
var bluebird = require('bluebird');
var Promise = bluebird.Promise;
var fs = bluebird.promisifyAll(require('fs'));
var glob = bluebird.promisify(require('glob'));
var strip = require('strip-json-comments');

module.exports = function checkUpgrade(dir, cb) {
    var options = {
        protocols: {},
        onconfig: function () {},
        basedir: dir,
        mountpath: null,
        inheritViews: false
    };

    fs.readFileAsync(path.resolve(options.basedir, 'package.json'), 'utf-8').then(function (pkg) {
        var info = JSON.parse(pkg);
        if (!semver.satisfies('1.0.5', info.dependencies['kraken-js'])) {
            return cb(new VError("package '%s' does not depend on kraken-js 1.0 and cannot be upgraded", info.name));
        }
    }).then(function () {
        return getConfig(options).then(function (config) {
            var middleware = toNamed(config.get('middleware'));
            return warningsAboutUnspecifiedEnables(middleware).concat(listDeprecatedMiddleware(middleware));
        });
    }).then(function (messages) {
        return warningsAboutImportsThatChangedBehavior(dir).then(function (warnings) {
            return messages.concat(warnings);
        });
    }).then(success(cb)).catch(cb);
};

function toNamed(obj) {
    var out = [];
    for (var k in obj) {
        out.push({name: k, value: obj[k]});
    }

    return out;
}

function getAllConfigsSeparately(dir) {
    return glob(path.join(dir, 'config/*.json')).then(function (results) {
        return Promise.all(results.map(fetchConfig));
    });
}

function fetchConfig(file) {
    return fs.readFileAsync(file, 'utf-8').then(function (file) {
        return {file: file, content: JSON.parse(strip(file))};
    });
}

function configHasImports(config) {
    return objHasImports(config.content);
}

function objHasImports(obj) {
    if (typeof obj === 'object') {
        for (var k in obj) {
            if (objHasImports(obj[k])) {
                return true;
            }
        }
    } else if (Array.isArray(obj[k])) {
        for (var i = 0; i < obj[k].length; i++) {
            if (objHasImports(obj[k])) {
                return true;
            }
        }
    } else if (typeof obj === 'string') {
        return /^import:/.test(obj);
    }

    return false;
}
function listDeprecatedMiddleware(middleware) {
    return middleware.filter(function (e) {
        return e.value === "kraken-js/middleware/404" ||
            (e.value.module && e.value.module.name === 'kraken-js/middleware/404') ||
            e.value === "kraken-js/middleware/500" ||
            (e.value.module && e.value.module.name === 'kraken-js/middleware/500');
    }).map(function (e) {
        return util.format("Middleware '%s' is deprecated. You should probably just remove it and let the defaults in Express work.", e.name);
    });
}

function warningsAboutUnspecifiedEnables(middleware) {
    return middleware.filter(function (e) {
        return !('enabled' in e.value);
    }).map(function (e) {
        return util.format("Middleware '%s' was not enabled before, but was not explicitly disabled. Add `\"enabled\": false` to its configuration to keep existing behavior.", e.name);
    });
}

function warningsAboutImportsThatChangedBehavior(dir) {
    return getAllConfigsSeparately(dir).then(function (configs) {
        return configs.filter(configHasImports).map(function (config) {
            return util.format("config '%s' has import: handlers. These are now resolved as each configuratio is merged, instead of at the end. Make sure this won't break your application", config.file);
        });
    });
}

function success(cb) {
    return function (success) {
        return cb(null, success);
    };
}
