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

    slaInfo: function(slas) {
      var self = this;

      var metrics = slas.metrics;
      // houses the return object we will send:
      // combo of slas endpoint and event metrics
      var buildReturn = {};
      buildReturn.metrics = [];
      var metricString;
      var metricsArray;

      var currentAccount = this.currentAccount();
      var currentUser = this.currentUser();

      var currentTimezone = currentUser.timeZone() || currentAccount.timeZone();
 
      var metricObject;

      // let's go through the policies
      slas.policy_metrics.forEach(function(policy, index, array) {
        if (policy.metric == 'first_reply_time' || 
                      policy.metric == 'next_reply_time') {
          metricString = 'reply_time';
        } else {
          metricString = policy.metric;
        }

        metricObject = {};
        metricObject.steps = [];
        metricObject.title = policy.metric;
        metricObject.stage= policy.stage;
        var reply_time_count = 0;
          
        metrics[metricString].forEach(function(eventMetric, position, marray) {
          // let's get the name of our SLA policy applied to the ticket
          if (buildReturn['title'] === undefined && 
                  eventMetric.type == 'apply_sla') {
            buildReturn['title'] = eventMetric.sla.policy.title;
            buildReturn['time'] = eventMetric.time;
            buildReturn['userTime'] = self.userTime(buildReturn['time']);
          }
         
          // let's not include measure or update_status in our results
          if (eventMetric.type == 'measure' ||
                   eventMetric.type == 'update_status') {
            
            return;

          } else {
            metricObject.steps.push({
              type: eventMetric.type,
              time: eventMetric.time,
              userTime: self.userTime(eventMetric.time)
            });
          }
        });

        buildReturn.metrics.push(metricObject);
      });

      return buildReturn;
    },

    userTime: function(timestamp) {
      var currentAccount = this.currentAccount();
      var currentUser = this.currentUser();

      var currentTimezone = currentUser.timeZone() || currentAccount.timeZone();

      return moment(timestamp).tz(currentTimezone.ianaName()).format('YYYY-MM-DD [at] hh:mm:ss a');
  },

    firstReplyTime: function(metrics) {
      var replyTimeArray = metrics['reply_time']; 
      // console.log(replyTimeArray);
      for (var i = 0; i < replyTimeArray.length; i++) {
        if (replyTimeArray[i].type == 'fulfill') {
          return { FRT: this.userTime(replyTimeArray[i].time) };
        }
      }
      return { FRT: 'No first reply time yet' };
    },

    init: function(e) {
      this.switchTo('loading');
      this.ajax('getTicketSlaData').done(function(data) {
        // only available to professional + plans
        slas = data.ticket.slas;
        slas.policies = slas.policy_metrics; // making this easier
        slas.metrics = data.ticket.metric_events;

        console.log(slas.policies);

        if (slas.policies.length < 1) {

          this.switchTo('noslas');

        } else {

          var slaInfoSend = this.slaInfo(slas);

          this.switchTo('slainfo', {
            nameTime: slaInfoSend,
          });
        }
      });
    }
  };
}());
