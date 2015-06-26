"use strict";

var upgrader = require('./');
var path = require('path');
var test = require('tap').test;

test('should tell us about incompatibilities', function (t) {
    upgrader(path.resolve(__dirname, 'fixtures', 'kraken-1.0-app'), function (err, result) {
        t.error(err);
        t.matches(result[0], /production.*unspec/);
        t.matches(result[1], /production.*byRef/);
        t.matches(result[2], /production.*fileNotFound/);
        t.matches(result[3], /production.*serverError/);
        t.matches(result[4], /development.*unspec/);
        t.matches(result[5], /development.*byRef/);
        t.matches(result[6], /development.*fileNotFound/);
        t.matches(result[7], /development.*serverError/);
        t.matches(result[8], /test.*unspec/);
        t.matches(result[9], /test.*byRef/);
        t.matches(result[10], /test.*findThis/);
        t.matches(result[11], /test.*fileNotFound/);
        t.matches(result[12], /test.*serverError/);
        t.matches(result[13], /config\/config.json.*import:/);
        t.matches(result[14], /meddleware@4/);
        t.equal(result.length, 15);
        t.end();
    });
});

test('should tell us to go away if the app already uses kraken 2.0', function (t) {
    upgrader(path.resolve(__dirname, 'fixtures', 'kraken-2.0-app'), function (err, result) {
        t.matches(err.message, /testapp/, 'mentions the name of the app');
        t.matches(err.message, /be upgraded/, "says it can't be upgraded");
        t.notOk(result, 'result must not be passed if there is an error');
        t.end();
    });
});
