var $ = require('jQuery');

$.ajax({
    url: 'http://whatsmyuseragent.com/',
    type: 'GET',
    dataType: 'html',
    headers: {
        'User-Agent': 'BDAutoRip/0.1.0.0'
    },
    success: function(response) {
        console.log(response);
    }
});