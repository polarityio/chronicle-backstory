'use strict';
polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  activeTab: 'events',
  actions: {
    changeTab: function (tabName) {
      this.set('activeTab', tabName);
    }
  }
});
