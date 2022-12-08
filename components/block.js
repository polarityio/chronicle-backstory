'use strict';
polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  initialTab: Ember.computed('block.data.details', function () {
    const iocSources = this.get('details.iocSources');
    const assets = this.get('details.assets');
    const events = this.get('details.events');
    if (Array.isArray(assets) && assets.length > 0) {
      return 'assets';
    }
    if (Array.isArray(events) && events.length > 0) {
      return 'events';
    }
    if (Array.isArray(iocSources)) {
      return 'iocSources';
    }
  }),
  init: function () {
    if (!this.get('block._state')) {
      this.set('block._state', {});
      this.set('block._state.activeTab', this.get('initialTab'));
    }
    this._super(...arguments);
  },
  actions: {
    changeTab: function (tabName) {
      this.set('block._state.activeTab', tabName);
    }
  }
});
