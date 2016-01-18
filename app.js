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

    slaName: function(slas, metrics) {
      var buildReturn = {};

      var metricString;

      // use the first policy.. sure why not.. what could possibly go wrong?
      if (slas.policy_metrics[0].metric == 'first_reply_time' || 
          slas.policy_metrics[0].metric == 'next_reply_time') {
        metricString = 'reply_time';
      } else {
        metricString = slas.policy_metrics[0].metric;
      }

      var metricsarray = metrics[metricString];

      // find the name of the policy by searching through each
      for (var i = 0; i < metricsarray.length; i++)  {
        if (metricsarray[i].type == 'apply_sla') {
          buildReturn['title'] = metricsarray[i].sla.policy.title;
          buildReturn['time'] = metricsarray[i].time;
          break;
        }
      }

      // use moment.js timezone to get user's time as well

      // todo: make a setting for am/pm vs 24h time
      // get user timezone

      var currentAccount = this.currentAccount();
      var currentUser = this.currentUser();

      var currentTimezone = currentUser.timeZone() || currentAccount.timeZone();

      buildReturn['userTime'] = this.userTime(buildReturn.time);

      return buildReturn;
    },

    userTime: function(timestamp) {
      var currentAccount = this.currentAccount();
      var currentUser = this.currentUser();

      var currentTimezone = currentUser.timeZone() || currentAccount.timeZone();

      return moment(timestamp).tz(currentTimezone.ianaName()).format('YYYY-MM-DD [at] HH:mm:ss');
  },

    firstReplyTime: function(metrics) {
      var replyTimeArray = metrics['reply_time']; 
      console.log(replyTimeArray);
      for (var i = 0; i < replyTimeArray.length; i++) {
        if (replyTimeArray[i].type == 'fulfill') {
          return { FRT: this.userTime(replyTimeArray[i].time) };
        }
      }
      return { FRT: 'No first reply time yet' };
    },

    init: function(e) {
      if (e.firstLoad) { this.switchTo('testing'); console.log('first load'); }
      var slas;
      var metric_events;
      this.ajax('getTicketSlaData')
        .done(function(data) {
          // only available to professional + plans
          slas = data.ticket.slas;

          // check if any SLA policies were applied to the ticket
          if (slas.policy_metrics.length < 1) {
            // no slas to highlight here
            this.switchTo('noslas');
          } else {
            metric_events = data.ticket.metric_events;
 
            console.log(slas);
            console.log(metric_events);

            // todo: convert this to user's local time
                  
            var slaInfo = this.slaName(slas, metric_events);
           
            var FRT = this.firstReplyTime(metric_events);
            this.switchTo('slainfo', {
              nameTime: slaInfo,
              metrics: slas.policy_metrics, 
              metric_events: metric_events,
              FRT: FRT.FRT
            });
          }
       });
    }
  };
}());
