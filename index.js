"use strict";

var getConfig = require('kraken-js/lib/config').create;
var util = require('util');
var path = require('path');
var VError = require('verror');
var semver = require('semver');
var bluebird = require('bluebird');
var fs = bluebird.promisifyAll(require('fs'));
var glob = bluebird.promisify(require('glob'));
var strip = require('strip-json-comments');

module.exports = function checkUpgrade(dir, cb) {

    fs.readFileAsync(path.resolve(dir, 'package.json'), 'utf-8').then(function (pkg) {
        var info = JSON.parse(pkg);
        if (!semver.satisfies('1.0.5', info.dependencies['kraken-js'])) {
            return cb(new VError("package '%s' does not depend on kraken-js 1.0 and cannot be upgraded", info.name));
        }
    }).then(warnAboutConfigs(dir))
    .then(function (messages) {
        return warningsAboutImportsThatChangedBehavior(dir).then(function (warnings) {
            return messages.concat(warnings).concat(meddlewareWarning);
        });
    }).then(success(cb)).catch(cb);
};

var meddlewareWarning = 'Be aware that middleware registered with `app.use` may be in a different order than with kraken 1.0. See the changes in meddleware@4.0.0 for more information.';

function toNamed(obj) {
    var out = [];
    for (var k in obj) {
        out.push({name: k, value: obj[k]});
    }

    return out;
}

function getAllConfigsSeparately(dir) {
    return glob(path.join(dir, 'config/*.json')).then(function (results) {
        return bluebird.all(results.map(fetchConfig));
    });
}

function fetchConfig(filename) {
    return fs.readFileAsync(filename, 'utf-8').then(function (file) {
        return {file: filename, content: JSON.parse(strip(file))};
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
    return getAllConfigsSeparately(dir).filter(configHasImports).map(function (config) {
        return util.format("config '%s' has import: handlers. These are now resolved as each configuration is merged, instead of at the end. Make sure this won't break your application", path.relative(dir, config.file));
    });
}

function success(cb) {
    return function (success) {
        return cb(null, success);
    };
}

function warnAboutConfigs(dir) {

    return function () {
        return glob(path.join(dir, 'config/*.json')).map(function (conf) {
            var base = path.basename(conf, '.json');
            return base === 'config' ? 'production' : base;
        }).filter(function (e) {
            return e[0] !== '_';
        }).reduce(function (warnings, env) {
            return warningsForConfig(env, dir).then(function (m) {
                return warnings.concat(m);
            });
        }, []);
    };
}

function warningsForConfig(env, dir) {
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
    }).then(function (config) {
        var middleware = toNamed(config.conf.get('middleware'));
        return warningsAboutUnspecifiedEnables(middleware).concat(listDeprecatedMiddleware(middleware)).map(function (e) {
            return util.format("In environment '%s', %s", config.env, e);
        });
    });
}
