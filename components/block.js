'use strict';
polarity.export = PolarityComponent.extend({
  details: Ember.computed.alias('block.data.details'),
  defaultNumAssetsToShow: 5,
  defaultNumEventsToShow: 5,
  numAssetsToShow: 5,
  numEventsToShow: 5,
  showAllAssets: false,
  showAllEvents: false,
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
    },
    toggleShowMoreAssets: function () {
      let numAssets = this.get('details.assets.length');
      this.toggleProperty('showAllAssets');

      if (this.get('showAllAssets')) {
        this.set('numAssetsToShow', numAssets);
      } else {
        this.set('numAssetsToShow', this.get('defaultNumAssetsToShow'));
      }
    },
    toggleShowMoreEvents: function () {
      let numEvents = this.get('details.events.length');
      this.toggleProperty('showAllEvents');

      if (this.get('showAllEvents')) {
        this.set('numEventsToShow', numEvents);
      } else {
        this.set('numEventsToShow', this.get('defaultNumEventsToShow'));
      }
    }
  }
});
