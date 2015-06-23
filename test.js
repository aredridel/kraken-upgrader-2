"use strict";

var upgrader = require('./');
var path = require('path');
var test = require('tap').test;

test('should tell us about incompatibilities', function (t) {
    upgrader(path.resolve(__dirname, 'fixtures', 'kraken-1.0-app'), function (err, result) {
        t.error(err);
        t.matches(result[0], /unspec/);
        t.matches(result[1], /byRef/);
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
