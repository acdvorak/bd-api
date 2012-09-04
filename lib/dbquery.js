var DBManager = require('./dbmanager').DBManager,
    schema = require('../docs/schema.json'),
    jQuery = require('jquery');

var dbManager = new DBManager();

function DBQuery(params, body) {
    this.params = params || {};
    this.body = body || {};
    this._callback = null;

    this.db = null;
    this.collection = null;

    this.exactFilter = {};
    this.queries = [];
    this.queries.numFinished = 0;

    this.default_iso_639_2 = 'eng';

    this.volume_label = this.params.volume_label;
    this.disc_iso_639_2 = this.params.disc_iso_639_2 || this.default_iso_639_2;
    this.video_iso_639_2 = this.params.video_iso_639_2 || this.disc_iso_639_2 || this.default_iso_639_2;

    var video_iso_639_2 = this.video_iso_639_2;

    this.paramHandlers = [
        {
            handle: function(params) {
                return params['volume_label'] ? { 'volume_label': params['volume_label'] } : null;
            },
            match_probability: 0.50
        },
        {
            handle: function(params) {
                var playlists = params['playlist'];

                if ( ! playlists ) return null;

                var filters = [];

                if ( ! Array.isArray(playlists) ) playlists = [ playlists ];

                playlists.forEach(function(playlist) {
                    var match = /^([^;]+\.MPLS);(\d+);([\d\.]+)$/.exec(playlist);

                    if ( ! match ) return;

                    var filter = {};

                    var filename = match[1],
                        filesize = parseInt(match[2]),
                        length_sec = parseFloat(match[3]);

                    if ( filename ) filter['playlists.filename'] = filename;
                    if ( filesize ) filter['playlists.filesize'] = filesize;
                    if ( length_sec ) filter['playlists.length_sec'] = length_sec;

//                    if ( video_iso_639_2 ) filter['playlists.ISO_639_2'] = video_iso_639_2;

                    filters.push(filter);
                });

                return { $or: filters };
            },
            match_probability: 0.50
        }
    ];
}

DBQuery.prototype.query = function(callback) {
    this._callback = callback;

    console.log('opening DB...');

    dbManager.connect(this._onopen.bind(this));
};

DBQuery.prototype._onopen = function(err, db) {
    if ( err ) return this._onerror(err);

    console.log('opened DB!');

    this.db = db;

    console.log('collecting releases...');

    db.collection('discs', this._oncollection.bind(this));
};

DBQuery.prototype._oncollection = function(err, collection) {
    if ( err ) return this._onerror(err);

    console.log('collected discs!');

    this.collection = collection;

    var dbquery = this;

    this._addQuery(this.exactFilter, 1.0);

    dbquery.paramHandlers.forEach(function(paramHandler) {
        var filter = paramHandler.handle(dbquery.params);

        if ( filter ) {
            dbquery._addQuery(filter, paramHandler.match_probability);
        }
    });

//    console.log('DBQuery.queries = ');
//    console.log(this.queries);
//    console.log('============================');
//    console.log(' ');
//    console.log(' ');
//    console.log(' ');

    this.queries.forEach(function(query) {
//        console.log('querying w/ filter: ', query.filter);

        dbquery.collection.find(query.filter).toArray(function(err, discs) {
//            console.log('DISCS:');
//            console.log(discs);
//            console.log('~~~~~~~~~~~~~~~~~~~~~');
            dbquery._onresults(err, discs, query);
        });
    });
};

DBQuery.prototype._addQuery = function(filter, match_probability) {
    if ( ! filter ) return;

    var volume_label = this.volume_label,
        disc_iso_639_2 = this.disc_iso_639_2;

    jQuery.extend(filter, {
//        'volume_label': volume_label,
//        'ISO_639_2': disc_iso_639_2
    }, filter);

    jQuery.extend(this.exactFilter, filter);

    this.queries.push({
        filter: filter,
        results: [],
        match_probability: match_probability
    });
};

DBQuery.prototype._onresults = function(err, discs, query) {
    this.queries.numFinished++;

    if ( err ) return this._onerror(err);

    query.results = jQuery.extend(discs, { match_probability: query.match_probability });

    if ( this.queries.numFinished === this.queries.length ) {
        this._oncomplete();
    }
};

DBQuery.prototype._oncomplete = function() {
    console.log('DBQuery._oncomplete()');

    this.queries.sort(function(a, b) {
        return b.results.match_probability - a.results.match_probability;
    });

    var id_map = {},
        results = [];

    var greatest_probability = 0;

    this.queries.forEach(function(query, index) {
        console.log('DBQuery.queries[', index, ']:');
        console.log('__________________________________');
        console.log(query.filter);
        console.log(' ');
        console.log(query.results);
        console.log('__________________________________');

        // If there's a perfect match, skip the rest
        if ( greatest_probability === 1 ) return;

        query.results.forEach(function(result) {
            if ( query.results.match_probability > greatest_probability )
                greatest_probability = query.results.match_probability;

            if ( ! id_map[result._id] ) {
                id_map[result._id] = true;
                result.match_probability = query.results.match_probability;
                results.push(result);
            }
        });
    });

    console.log(' ');
    console.log(' ');
    console.log(' ');
    console.log('****************************************');
    console.log(' ');
    console.log(' ');
    console.log(' ');

    console.log(results);

    results.forEach(function(result) {

    });

    if ( jQuery.isFunction(this._callback) ) {
        this._callback(null, results);
    }
};

DBQuery.prototype._onerror = function(err, results) {
    console.error('DBQuery._onerror()');

    if ( err ) {
        console.error(err);

        if ( jQuery.isFunction(this._callback) ) {
            this._callback(err, results);
        }
    }
};

DBQuery.prototype.post = function(callback) {
    this._callback = callback;

    console.log('opening DB...');

    dbManager.connect((function(err, db) {
        if ( err ) return this._onerror(err);

        console.log('opened DB!');

        this.db = db;

        console.log('collecting releases...');

        db.collection('discs', (function(err, collection) {
            if ( err ) return this._onerror(err);

            console.log('collected discs!');

            this.collection = collection;

            console.log('POST body: ', this.body);

            if ( jQuery.isFunction(this._callback) ) {
                this._callback(null, {});
            }
        }).bind(this));
    }).bind(this));
};

DBQuery.prototype.init = function() {
    dbManager.connect(function(err, db) {
        if(err) {
            console.error(err);
            return;
        }

        if ( db.discs )
            db.discs.drop();

        db.collection('discs', function(err, collection) {
            if(err) {
                console.error(err);
                return;
            }

            collection.insert(schema.discs, { safe:true }, function(err, result) {
                if(err) {
                    console.error(err);
                    return;
                }

                console.log(result);
            });
        });
    });
};

DBQuery.Query = function(params, callback) {
    new DBQuery(params).query(callback);
};

DBQuery.Post = function(params, body, callback) {
    new DBQuery(params, body).post(callback);
};

DBQuery.Init = function() {
    new DBQuery().init();
};

exports.DBQuery = {
    query: DBQuery.Query,
    post: DBQuery.Post,
    init: DBQuery.Init
};
