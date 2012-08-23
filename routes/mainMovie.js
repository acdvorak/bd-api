var url = require('url'),
    qs = require('querystring'),
    DBQuery = require('../lib/dbquery').DBQuery;

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
