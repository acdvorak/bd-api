var url = require('url'),
    qs = require('querystring'),
    DBQuery = require('../lib/dbquery').DBQuery;

var DBManager = require('../lib/dbmanager').DBManager;
var dbManager = new DBManager();
var schema = require('../docs/schema.json');

/*
 * GET main .mpls file for requested movie and mpls track sizes in bytes
 */

exports.mainMovie = function(req, res) {
    var timeout = setTimeout(function() {
        sendResponse(res, false, null, [
            { 'textStatus': 'timeout',
              'errorMessage': 'operation timed out' }
        ]);
    }, 60000);

    function sendResponse(res, success, result, errors) {
        if ( timeout ) {
            clearTimeout(timeout);
            timeout = null;
        } else {
            return;
        }

        var json = {
            'success': success,
            'error': !success,
            'errors': errors || []
        };

        if ( success ) {
            json['result'] = result;
        }

        try {
            res.send(json);
            res.end();
        } catch(e) {
            console.error(e);
        }
    }

    var params = qs.parse(url.parse(req.url).search.replace(/^\?/, ''));

    console.log(params);

    DBQuery.query(params, function(err, results) {
        if ( err ) {
            sendResponse(res, false, results, [ { 'textStatus': err } ]);
        } else {
            sendResponse(res, true, results);
        }
    });
};

exports.init = function(req, res) {
    dbManager.connect(function(err, db) {
        if ( err ) return console.error(err);

        console.log('opened DB!');

        if (db.discs)
            db.discs.drop();

        db.collection('discs', function(err, collection) {
            if ( err ) return console.error(err);

            schema.discs.forEach(function(disc, i) {
                collection.insert(disc, {safe:true}, function(err, result) {
                    if ( err ) return console.error(err);

                    console.log(i, ' - Inserted disc: result = ', result);
                });
            });
        });
    });
    res.send(200);
};
