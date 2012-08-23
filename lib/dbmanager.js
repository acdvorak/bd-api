var mongo = require('mongodb'),
    Server = mongo.Server,
    MongoDB = mongo.Db;

/**
 * Lazily connects to the requested database only when you call <code>.connect()</code> or <code>.query()</code>
 * @param {String} [dbname="bdapi"]
 * @param {String} [hostname="localhost"]
 * @param {Number} [port=27017]
 * @constructor
 */
function DBManager(dbname, hostname, port) {
    this._db = null;
    this._ready = false;
    this._jobs = [];
    this._startTime = (new Date()).getTime();
    this._lastTick = this._startTime;
    this._interval = setInterval(this._checkStatus.bind(this), 100);
    this._initialized = false;
    this._conn = new MongoDB(dbname || 'bdapi', new Server(hostname || 'localhost', port || 27017, { auto_reconnect: true }));
}

/**
 *
 * @param callback <code>function(err, db) { ... }</code>
 */
DBManager.prototype.connect = function(callback) {
    if ( ! this._initialized ) {
        this._conn.open(this._onconnect.bind(this));
        this._initialized = true;
    }

    if ( this._ready ) {
        callback(null, this._db);
    } else {
        this._jobs.push(callback);
    }
};

/**
 *
 * @param err
 * @param db
 * @private
 */
DBManager.prototype._onconnect = function(err, db) {
    if ( err ) {
        console.error(err);
        return;
    }
    this._db = db;
    this._ready = true;
};

/**
 *
 * @private
 */
DBManager.prototype._checkStatus = function() {
    this._lastTick = (new Date()).getTime();

    if ( this._ready ) {
        while ( this._jobs.length ) {
            (this._jobs.shift())(null, this._db);
        }
        this._clearInterval();
    }

    if ( this._lastTick - this._startTime > (1000 * 30) ) {
        this._clearInterval();
    }
};

/**
 *
 * @private
 */
DBManager.prototype._clearInterval = function() {
    clearInterval(this._interval);
    this._interval = null;
};

exports.DBManager = DBManager;
