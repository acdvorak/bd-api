var DBManager = require('./dbmanager').DBManager,
    schema = require('../docs/schema.json'),
    jQuery = require('jquery');

var dbManager = new DBManager();

function DBQuery(params) {
    this.params = params;
    this._callback = null;

    this.db = null;
    this.collection = null;

    this.paramHandlers = [
        {
            handle: function(params) {
                return params['volume_label'] ? { 'titles.discs.volume_label': params['volume_label'] } : null;
            },
            match_probability: 0.10
        },
        {
            handle: function(params) {
                return params['disc_name'] ? { 'titles.discs.name': params['disc_name'] } : null;
            },
            match_probability: 0.20
        },
        {
            handle: function(params) {
                var org_id = params['org_id'],
                    disc_id = params['disc_id'];

                return org_id && disc_id ? {
                    'titles.discs.bd_org_id': org_id.toLowerCase(),
                    'titles.discs.bd_disc_id': disc_id.toLowerCase()
                } : null;
            },
            match_probability: 0.20
        },
        {
            handle: function(params) {
                var playlists = params['mpls'];

                if ( ! playlists ) return null;

                var filters = [];

                if ( ! Array.isArray(playlists) ) playlists = [ playlists ];

                playlists.forEach(function(mpls) {
                    var match = /^([^;]+\.MPLS);(\d+);(\d+)$/.exec(mpls);

                    if ( ! match ) return;

                    var filter = {};

                    var filename = match[1],
                        filesize = parseInt(match[2]),
                        length = parseInt(match[3]);

                    if ( filename ) filter['titles.discs.playlists.filename'] = filename;
                    if ( filesize ) filter['titles.discs.playlists.filesize'] = filesize;
                    if (  length  ) filter['titles.discs.playlists.length']   = length;

                    filters.push(filter);
                });

                return { $or: filters };
            },
            match_probability: 0.50
        }
    ];

    this.exactFilter = {};
    this.queries = [];
    this.queries.numFinished = 0;

    this.country = params.country || 'US';
    this.language = params.language || 'EN';
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

    db.collection('releases', this._oncollection.bind(this));
};

DBQuery.prototype._oncollection = function(err, collection) {
    if ( err ) return this._onerror(err);

    console.log('collected releases!');

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

        dbquery.collection.find(query.filter).toArray(function(err, releases) {
//            console.log('RELEASES:');
//            console.log(releases);
//            console.log('~~~~~~~~~~~~~~~~~~~~~');
            dbquery._onresults(err, releases, query);
        });
    });
};

DBQuery.prototype._addQuery = function(filter, match_probability) {
    if ( ! filter ) return;

    var country = this.country,
        language = this.language;

    jQuery.extend(filter, {
        'country': country,
        'language': language,
        'titles.discs.playlists.language': language
    }, filter);

    jQuery.extend(this.exactFilter, filter);

    this.queries.push({
        filter: filter,
        results: [],
        match_probability: match_probability
    });
};

DBQuery.prototype._onresults = function(err, releases, query) {
    this.queries.numFinished++;

    if ( err ) return this._onerror(err);

    query.results = jQuery.extend(releases, { match_probability: query.match_probability });

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

DBQuery.prototype._

DBQuery.prototype._onerror = function(err, results) {
    console.error('DBQuery._onerror()');

    if ( err ) {
        console.error(err);

        if ( jQuery.isFunction(this._callback) ) {
            this._callback(err, results);
        }
    }
};

DBQuery.prototype.init = function() {
    dbManager.connect(function(err, db) {
        if(err) {
            console.error(err);
            return;
        }

        db.collection('releases', function(err, collection) {
            if(err) {
                console.error(err);
                return;
            }

            collection.insert(schema.releases, { safe:true }, function(err, result) {
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

exports.DBQuery = { query: DBQuery.Query };
