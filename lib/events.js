module.exports = {
  'app.activated': 'doSomething',
  'app.willDestroy': function() { console.log('destroying'); }
};
