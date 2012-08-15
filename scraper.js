/*
 * RUN THIS ON www.cinemasquid.com
 */

var $ = require('jQuery')
  , jsdom = require('./node_modules/jquery/node_modules/jsdom/lib/jsdom').jsdom
//  , jQuery  = $.create()
//  , document = jsdom("<html><head></head><body>hello world</body></html>")
//  , window   = document.createWindow()
//  , $window  = $.create(window)
;

function Scraper(onsuccess, onerror) {
    /** @type jQuery */
    this.$window = null;

    this.baseUrl = 'http://www.cinemasquid.com/';
    this.userAgent = 'BDAutoRip/0.1.0.0';
    this.timeout = 30000; // in MS

    this.movieName = '';
    this.mplsTrackSizes = [];
    this.correctTrackSize = null;

    this.onsuccess = onsuccess || function(mainMplsFileSize) {};
    this.onerror = onerror || function(textStatus, errorThrown) {};
}

exports.Scraper = Scraper;

Scraper.Find = function(movieName, mplsTrackSizes, onsuccess, onerror) {
    var scraper = new Scraper(onsuccess, onerror);
    scraper.find(movieName, mplsTrackSizes);
};

/**
 * 
 * @param {String} url
 * @return {String}
 */
Scraper.prototype.resolveUrl = function(url) {
    return /^\w+:/.test(url) ? url : this.baseUrl + url.replace(/^\//, '');
};

/**
 * Returns a new array w/ the normalized track sizes in bytes
 * @param {Array} mplsTrackSizes immutable
 * @return {Array} 
 */
Scraper.prototype.normalizeTrackSizes = function(mplsTrackSizes) {
    var normalizedTrackSizes = [];
    var scraper = this;
    $.each(mplsTrackSizes, function(i, mplsTrackSize) {
        var normalized = scraper.normalizeTrackSize(mplsTrackSize);
        if( normalized )
            normalizedTrackSizes.push(normalized);
    });
    return normalizedTrackSizes;
};

/**
 * 
 * @param {String} mplsTrackSize
 * @return {String} normalized track size in bytes w/ commas and all other characters removed
 */
Scraper.prototype.normalizeTrackSize = function(mplsTrackSize) {
    var match = /[\d,]+/.exec(mplsTrackSize);
    if ( match )
        return match[0].replace(/\D/g, '');
    else
        return '';
};

/**
 *
 * @param {String} tdTrackSize
 * @return {String} normalized track size in bytes w/ commas and all other characters removed
 */
Scraper.prototype.getTdTrackSize = function(tdTrackSize) {
    var match = /\b([\d,]+)\s+bytes\b/.exec(tdTrackSize);
    if ( match )
        return match[1].replace(/\D/g, '');
    else
        return '';
};

/**
 *
 * @return {Boolean}
 */
Scraper.prototype.isFound = function() {
    return !!this.correctTrackSize;
};

/**
 *
 * @param {String} url
 * @param {Object|String} [data]
 * @param {Function} successFn function($window) { ... }
 * @param {Function} [errorFn] function(textStatus, errorThrown) { ... }
 */
Scraper.prototype.loadUrl = function(url, data, successFn, errorFn) {
    url = this.resolveUrl(url);

    // data param omitted
    if ( typeof data === 'function' ) {
        errorFn = successFn;
        successFn = data;
        data = null;
    }

    var scraper = this;

    $.ajax({
        url: url,
        type: 'GET',
        data: data,
        dataType: 'html',
        headers: {
            'User-Agent': this.userAgent
        },
        timeout: this.timeout,
        success: function(data, textStatus, jqXHR) {
            // Slow and doesn't work :-(
//            var document = jsdom(data)
//              , window = document.createWindow()
//              , $window = $($.create(window))
//            ;

            var $window = scraper.createWindow(data);

            successFn($window);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error('ERROR: "', textStatus, '": ', errorThrown);
            if ( typeof errorFn === 'function' )
                errorFn(textStatus, errorThrown);
            scraper.onerror(textStatus, errorThrown);
        }
    });
};

/**
 * NOTE: This function is asyncronous, so you can only call it ONCE per instance!!!
 * TODO: Make this method static
 * @param {String} movieName
 * @param {Array} mplsTrackSizes
 */
Scraper.prototype.find = function(movieName, mplsTrackSizes) {
    this.movieName = movieName;
    this.mplsTrackSizes = this.normalizeTrackSizes(mplsTrackSizes);
    this.correctTrackSize = null;

    var scraper = this;

    this.loadUrl('/blu-ray/movies/search', { 'title-search': movieName }, function($searchWindow) { scraper.handleSearchResults($searchWindow); });
};

Scraper.prototype.handleSearchResults = function($searchWindow) {
    this.$searchResults = $($searchWindow.find('.items .item h3 a'));
    this.curSearchResultIndex = 0;
    this.handleNextSearchResult();
};

Scraper.prototype.handleNextSearchResult = function() {
    if ( this.curSearchResultIndex < this.$searchResults.length ) {
        var $searchResultLink = this.$searchResults.eq(this.curSearchResultIndex);
        this.handleSearchResult($searchResultLink);
        this.curSearchResultIndex++;
    } else {
        this.onerror('noresults', 'no results were found');
    }
};

Scraper.prototype.handleSearchResult = function($searchResultLink) {
    var scraper = this;
    var url = $searchResultLink.attr('href');
    console.log('Loading search result URL = "', url, '"');
    this.loadUrl(url, function($titleWindow) { scraper.parseTitle($titleWindow) });
};

Scraper.prototype.parseTitle = function($titleWindow) {
    var specsUrl =
        $('#description', $titleWindow)
            .closest('.description')
            .find('.compare a')
            .filter(function() { return /Specs/i.test($(this).text()); })
            .attr('href');

    var scraper = this;

    console.log('specs URL = "', specsUrl, '"');

    if ( specsUrl ) {
        this.loadUrl(this.resolveUrl(specsUrl), function($specsWindow) { scraper.parseSpecs($specsWindow); });
    } else {
        this.handleNextSearchResult();
    }
};

Scraper.prototype.parseSpecs = function($specsWindow) {
    var scraper = this;
    var $tds =
        $('.info.track', $specsWindow)
            .find('td:not(:has(*))')
            .filter(function() { return !!scraper.getTdTrackSize($(this).text()); });

    $tds.each(function() {
        if ( scraper.parseTd($(this)) )
            return false; // break $.each() loop
    });

    if ( this.isFound() ) {
        console.log('Found main .mpls file for "', this.movieName, '": ', this.correctTrackSize);

        this.onsuccess(this.correctTrackSize);
    }

    if ( ! this.isFound() )
        this.handleNextSearchResult();
};

Scraper.prototype.parseTd = function($td) {
    var tdTrackSize = this.getTdTrackSize($td.text());

    var scraper = this;

    $.each(this.mplsTrackSizes, function(j, curTrackSize) {
        var matches = tdTrackSize.indexOf(curTrackSize) != -1;

//        console.log('td = "', tdTrackSize, '" vs. mplsTrackSizes[', j, '] = "', curTrackSize, '"');

        if ( matches ) {
            var titleText = $td.closest('.info.track').prevAll('.item.title').eq(0).find('h3 a').text();

            if ( ! (/:\s+\w+\s+Render/i.test(titleText)) ) {
                scraper.correctTrackSize = curTrackSize;

                return false; // break $.each() loop
            }
        }
    });
    
    return this.isFound();
};

Scraper.prototype.stripHtml = function(html) {
    var bodyHtml = html.replace(/.*<body[^>]*>/i, '');
    var lastIndex = bodyHtml.lastIndexOf('</body>');
    if ( lastIndex != -1 ) {
        bodyHtml = bodyHtml.substr(0, lastIndex);
    }
    bodyHtml = bodyHtml.replace(/<\/?script[^>]*>/gi, '');
    return bodyHtml;
};

Scraper.prototype.createWindow = function(html) {
    return $('<div/>').html(this.stripHtml(html));
};

var movies = [
    { query: 'the incredibles', trackSizes: [ '29,893,386,240', '29,871,783,936', '29,871,513,600', '29,893,386,240' ] },
    { query: 'wall-e', trackSizes: [ '22,976,261,184', '22,930,132,992', '22,751,784,960' ] },
    { query: 'tangled', trackSizes: [ '26,974,599,168', '26,974,660,608', '26,810,068,992' ] },
    { query: 'mummy returns', trackSizes: [ '31,311,243,264' ] }
];

$.each(movies, function(i, movie) {
//    new Scraper().find(movie.query, movie.trackSizes);
});
