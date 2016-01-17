(function() {

  return {

    events: {
      'app.activated': 'init',
      'app.willDestroy': function() { console.log('app is about ' +
                                                  'to be destroyed'); }
    },

    requests: {
      getTicketSlaData: function() {
        var curTicket = this.ticket();
        return {
          type: 'GET',
          url: '/api/v2/tickets/' + curTicket.id() +
            '?include=slas,metric_events',
          dataType: 'json'
        };
      }
    },

    init: function(e) {
      if (e.firstLoad) { this.switchTo('testing'); console.log('first load'); }
      var slas;
      var metric_events;
      this.ajax('getTicketSlaData')
        .done(function(data) {
          console.log(data);
          // only available to professional + plans
          slas = data.ticket.slas;
          metric_events = data.ticket.metric_events;
          this.switchTo('testing', { slas: slas, metric_events: metric_events });
     
          console.log(slas);
          console.log(metric_events);

       });
      
    }
  };

}());
