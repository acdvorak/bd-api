var url = require('url'),
    qs = require('querystring'),
    Scraper = require('../scraper').Scraper;

/*
 * GET main .mpls file for requested movie and mpls track sizes in bytes
 */

exports.mpls = function(req, res) {
    var timeout = setTimeout(function() {
        sendResponse(res, false, null, [
            { 'textStatus': 'timeout',
              'errorMessage': 'operation timed out' }
        ]);
    }, 60000);

    function sendResponse(res, success, mainMplsFileSize, errors) {
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
            json['mainMplsFileSize'] = mainMplsFileSize;
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

    var movieName = params.query;
    var mplsTrackSizes = params.mplsSize;

    if ( ! movieName ) {
        sendResponse(res, false, null, [
            { 'textStatus': 'missingparam',
              'errorMessage': 'Missing "query" parameter' }
        ]);
    }
    else if ( ! mplsTrackSizes ) {
        sendResponse(res, false, null, [
            { 'textStatus': 'missingparam',
              'errorMessage': 'Missing "mplsSize" parameter - 1 or more required' }
        ]);
    }
    else {
        mplsTrackSizes = Array.isArray(mplsTrackSizes) ? mplsTrackSizes : [ mplsTrackSizes ];

        Scraper.Find(
            movieName, mplsTrackSizes,
            function(mainMplsFileSize) {
                sendResponse(res, true, mainMplsFileSize);
            },
            function(textStatus, errorThrown) {
                sendResponse(res, false, null, [
                    { 'textStatus': textStatus,
                      'errorMessage': errorThrown }
                ]);
            }
        );
    }
};