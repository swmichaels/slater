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


    // returns a nice juicy piece of SLA policy + metrics
    slaInfo: function(slaJSON) {
      var self = this;

      var metrics = slaJSON.events;
      // houses the return object we will send:
      // combo of slas endpoint and event metrics
      var slaObject = {};
      slaObject.metrics = [];
      var metricString;
      var metricsArray;

      var currentAccount = this.currentAccount();
      var currentUser = this.currentUser();

      var currentTimezone = currentUser.timeZone() || currentAccount.timeZone();
 
      var metricObject;

      // filter sla metric data

      // let's go through the policies
      slaJSON.policy_metrics.forEach(function(policy, index, array) {
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
          if (slaObject['title'] === undefined && 
                  eventMetric.type == 'apply_sla') {
            slaObject['title'] = eventMetric.sla.policy.title;
            slaObject['time'] = eventMetric.time;
            slaObject['userTime'] = self.userTime(slaObject['time']);
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

        slaObject.metrics.push(metricObject);
      });

      return slaObject;
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
        var slaJSON = data.ticket.slas;
 
        if (slaJSON === undefined || slaJSON.policy_metrics.length < 1) {
          this.switchTo('noslas');  
          
        } else {

          var slaObject = {};
          var metric_events = data.ticket.metric_events;
          // attach each metrics array to its associated policy metrics
          var changedKey;

          slaObject.targets = _.map(slaJSON.policy_metrics, 
            function(target) {
              if (target.metric == 'first_reply_time' ||
                  target.metric == 'next_reply_time') {

                target.history = metric_events['reply_time'];

              } else {
                target.history = metric_events[target.metric];
              }
              return target;
            });

          this.switchTo('slainfo', {
            sla: slaObject,
          });
       }
      });
    }
  };
}());
