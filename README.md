kraken-upgrader-2
=================

Embodies the knowledge of how to upgrade kraken 1.0 apps to kraken 2.0.

Use
----

```
var upgrader = require('kraken-upgrader-2')
upgrader('/path/to/app', function (err, result) {
    if (err) {
        console.warn("An error happened", err);
    } else {
        console.log("To upgrade your app, be aware of these things:");
        result.forEach(function (e) {
            console.log(e);
        });
    }
});
