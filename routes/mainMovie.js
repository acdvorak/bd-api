var url = require('url'),
    qs = require('querystring'),
    DBQuery = require('../lib/dbquery').DBQuery;

var DBManager = require('../lib/dbmanager').DBManager;
var dbManager = new DBManager();
var schema = require('../docs/schema.json');

/*
 * GET main .mpls file for requested movie and mpls track sizes in bytes
 */

exports.findMainMovie = function(req, res) {
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
            json['discs'] = result;
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

    DBQuery.query(req, params, function(err, results) {
        if ( err ) {
            sendResponse(res, false, results, [ { 'textStatus': err } ]);
        } else {
            sendResponse(res, true, results);
        }
    });
};

exports.newMainMovie = function(req, res) {
    console.log('~~~~~~~~~~~~~~~~~~');
    console.log('');
    console.log('POST body: ', req.body);
    console.log('');
    console.log('Request: ', req);
    console.log('');
    console.log('~~~~~~~~~~~~~~~~~~');

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

        try {
            res.send(json);
            res.end();
        } catch(e) {
            console.error(e);
        }
    }

    var search = url.parse(req.url).search || '';
    var params = qs.parse(search.replace(/^\?/, ''));
    var body = req.body;

    console.log('Params: ', params);
    console.log('JSON: ', params.json ? JSON.parse(params.json) : '');

    DBQuery.post(req, params, body, function(err, results) {
        if ( err ) {
            if ( typeof(err) === 'string' )
                err = { 'textStatus': err };
            sendResponse(res, false, results, [ err ]);
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
