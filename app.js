(function() {

  return {

    events: {
      'app.activated': 'init',
      'ticket.updated': 'init',      

      //toggle buttons in slainfo
      'click #target_toggle': function(event) {
        this.$('.targets').toggle();
      },
      'click #first_reply_time_toggle': function(event) {
        this.$('#first_reply_time').toggle();
      }, 
      'click #next_reply_time_toggle': function(event) {
        this.$('#next_reply_time').toggle();
      }, 
      'click #requester_wait_time_toggle': function(event) {
        this.$('#requester_wait_time').toggle();
      }, 
      'click #agent_work_time_toggle': function(event) {
        this.$('#agent_work_time').toggle();
      },      
      'click #periodic_update_time_toggle': function(event) {
        this.$('#periodic_update_time').toggle();
      },
      'click #resolution_time_toggle': function(event) {
        this.$('#resolution_time').toggle();
      },

      //toggle button in noslas
      'click #not_detected_toggle': function(event) {
        this.$('.no_sla_explanation').toggle();
      },

      //toggle buttons for glossary      
      'click #glossary': function(event) {
      	if (this.currentUser().locale() === 'es' ||
      		this.currentUser().locale() === 'es-ES' ||
      		this.currentUser().locale() === 'es-419') {
      		this.switchTo('glossary_es', {
      			ticketid: this.ticket().id(),
      		});  
      	} else {
      		this.switchTo('glossary_en', {
      			ticketid: this.ticket().id(),
      		});
      	}
      },
      'click #goback': 'init',

      //toggle buttons in glossary for definitions
      'click #definition1name': function(event) {
        this.$('#definition1').toggle();
      },      
      'click #definition2name': function(event) {
        this.$('#definition2').toggle();
      },
      'click #definition3name': function(event) {
        this.$('#definition3').toggle();
      },
      'click #definition4name': function(event) {
        this.$('#definition4').toggle();
      },
      'click #definition5name': function(event) {
        this.$('#definition5').toggle();
      },
      'click #definition6name': function(event) {
        this.$('#definition6').toggle();
      },
      'click #definition7name': function(event) {
        this.$('#definition7').toggle();
      },
      'click #definition8name': function(event) {
        this.$('#definition8').toggle();
      },
      'click #definition9name': function(event) {
        this.$('#definition9').toggle();
      },
      'click #definition10name': function(event) {
        this.$('#definition10').toggle();
      },
      'click #definition11name': function(event) {
        this.$('#definition11').toggle();
      },      
      'click #definition12name': function(event) {
        this.$('#definition12').toggle();
      },
      'click #definition13name': function(event) {
        this.$('#definition13').toggle();
      },
      'click #definition14name': function(event) {
        this.$('#definition14').toggle();
      },
      'click #definition15name': function(event) {
        this.$('#definition15').toggle();
      },
      'click #definition16name': function(event) {
        this.$('#definition16').toggle();
      },
      'click #definition17name': function(event) {
        this.$('#definition17').toggle();
      },
      'click #definition18name': function(event) {
        this.$('#definition18').toggle();
      },
      'click #definition19name': function(event) {
        this.$('#definition19').toggle();
      },
      'click #definition20name': function(event) {
        this.$('#definition20').toggle();
      },
    },

    //gets the SLA info from the API
    requests: {
      getTicketSlaData: function() {
        var curTicket = this.ticket().id();
        return {
          type: 'GET',
          url: '/api/v2/tickets/' + curTicket + '?include=slas,metric_events',
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

    // Remove objects from array containing "type: measure" or "type: update_status"
    removeHistoryTypes: function(array) {
      return _.filter(array, function(e) {
        return (e.type != 'measure' && e.type != 'update_status');
      });
    },

    //attaches metric events to targets
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
        var slaJSON = data.ticket.slas;
        var thisID = self.ticket().id();

        if (slaJSON === undefined || slaJSON.policy_metrics.length < 1) {
          this.switchTo('noslas', {
          	ticketid:thisID,
          });  

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

          // add user's local times in all places where a timestamp exists
          this.historyUserTimes(slaObject.targets);
          this.breachUserTimes(slaObject.targets);

          this.switchTo('slainfo', {
            sla: slaObject,
            ticketid: thisID,
          });
        }
      })
      .fail(function(err) {
        var thisID = self.ticket().id();
      	this.switchTo('noslas', {
          ticketid: thisID,
        });
      });
    },
  };
}());

