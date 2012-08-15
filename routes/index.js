
/*
 * GET home page.
 */

exports.index = function(req, res){
  res.render('index', {
      title: 'Blu-ray MPLS Database',
      examples: {
          success: [
              {
                  title: 'The Incredibles',
                  url: '/api/v1/mpls?query=the+incredibles&mplsSize=29,893,386,240&mplsSize=29,871,783,936&mplsSize=29,871,513,600&mplsSize=29,893,386,240'
              },
              {
                  title: 'Wall-E',
                  url: '/api/v1/mpls?query=wall-e&mplsSize=22,976,261,184&mplsSize=22,930,132,992&mplsSize=22,751,784,960'
              },
              {
                  title: 'Tangled',
                  url: '/api/v1/mpls?query=tangled&mplsSize=26,974,599,168&mplsSize=26,974,660,608&mplsSize=26,810,068,992'
              },
              {
                  title: 'The Mummy Returns',
                  url: '/api/v1/mpls?query=the+mummy+returns&mplsSize=31,311,243,264'
              }
          ],
          error: [
              {
                  title: 'Lord of the Rings: Return of the King (Extended Edition)',
                  url: '/api/v1/mpls?query=return+of+the+king+extended&mplsSize=22,333,444,555',
                  reason: 'No data available for Extended edition (yet)'
              }
          ]
      }
  });
};