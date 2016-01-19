(function() {

  return {

    events: {
      'app.activated': 'init',
      'app.willDestroy': function() { console.log('app is about ' +
                                                  'to be destroyed'); },
      'ticket.save': 'init'
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

    // converts ZD API timestamps into User's local time
    userTime: function(timestamp) {
      var currentAccount = this.currentAccount();
      var currentUser = this.currentUser();

      var currentTimezone = currentUser.timeZone() || currentAccount.timeZone();

      return moment(timestamp).tz(currentTimezone.ianaName())
        .format('YYYY-MM-DD [at] hh:mm:ss a z');
    },

    // Remove objects from array containing type: measure or type:
    // update_status
    removeHistoryTypes: function(array) {
      return _.filter(array, function(e) {
        return (e.type != 'measure' && e.type != 'update_status');
      });
    },

    attachMetricEvents: function(slaJSON, metric_events) {

      var targets = _.map(slaJSON.policy_metrics, 
          function(target) {
            if (target.metric == 'first_reply_time' ||
                target.metric == 'next_reply_time') {

              target.history = metric_events['reply_time'];

            } else {
              target.history = metric_events[target.metric];
            }
            return target;
          });
      return targets;
    },

    // gets the SLA Policy name and time applied to ticket
    getPolicyInfo: function(array) {
      var element = _.chain(array).where({ type: 'apply_sla' }).last().value();
      return {title: element.sla.policy.title, time: element.time};

    },

    // loop through all history arrays and add a usertime key/value pair
    historyUserTimes: function(targets) {
      var self = this;
      _.each(targets, function(target) {
        _.each(target.history, function (history) {
          history['usertime'] = self.userTime(history.time); 
        });
      });
    },

    // loop through all history arrays and add a usertime key/value pair
    breachUserTimes: function(array) {
      var self = this;
      _.each(array, function(element) {
        element['breach_atusertime'] = self.userTime(element.breach_at);
      });
    },

    init: function(e) {
      this.switchTo('loading');
      this.ajax('getTicketSlaData').done(function(data) {
        var self = this;
        // only available to professional + plans
        var slaJSON = data.ticket.slas;

        if (slaJSON === undefined || slaJSON.policy_metrics.length < 1) {
          this.switchTo('noslas');  

        } else {

          // create an object to pass to the templates
          var slaObject = {};
          
          // merge sideloaded data
          slaObject.targets = this.attachMetricEvents(slaJSON, 
              data.ticket.metric_events);

          // strip extra types
          _.each(slaObject.targets, function(target) {
            target.history = self.removeHistoryTypes(target.history);
          });

          // get SLA Policy name and time applied to ticket using
          // sla data's first element
          //var info = this.getPolicyInfo(slaObject.targets[0]['history']);

          // populate important status data
          //slaObject.title = info.title;
          //slaObject.time = info.time;

          // add user's local times in all places where a timestamp exists
          this.historyUserTimes(slaObject.targets);
          this.breachUserTimes(slaObject.targets);

          console.log(slaObject);
          this.switchTo('slainfo', {
            sla: slaObject,
          });
        }
      })
      .fail(function(err) {
        this.switchTo('noslas.hdbs');
      });
    }
  };
}());
