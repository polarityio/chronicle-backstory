const _ = require('lodash');

const createLookupResults = (entityGroups, iocDetails, assets, events) =>
  _.flatMap(entityGroups, (entityGroup, entityType) =>
    _.map(entityGroup, ({ value: entityValue }) => {
      const iocDetail = iocDetails[entityValue];
      const asset = assets[entityValue];
      const event = events[entityValue];
      const resultsFound = iocDetail || asset || event;

      return {
        entity,
        data: !resultsFound
          ? null
          : {
              summary: _createSummary(iocDetail, asset, event),
              details: {
                ...iocDetail,
                ...asset,
                ...event
              }
            }
      };
    })
  );

const _createSummary = (iocDetail, asset, event) => [];

module.exports = createLookupResults;