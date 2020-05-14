const _ = require('lodash');

const createLookupResults = (entityGroups, iocDetailsMap, assetsMap, eventsMap) =>
  _.flatMap(entityGroups, (entityGroup, entityType) =>
    _.map(entityGroup, (entity) => {
      const iocDetails = iocDetailsMap[entity.value];
      const assets = assetsMap[entity.value];
      const events = eventsMap[entity.value];
      const resultsFound =
        (iocDetails && iocDetails.iocSources && iocDetails.iocSources.length) ||
        (assets && assets.assets && assets.assets.length) ||
        (events && events.events && events.events.length);

      return {
        entity,
        data: !resultsFound
          ? null
          : {
              summary: _createSummary(iocDetails, assets, events),
              details: {
                ...iocDetails,
                ...assets,
                ...events
              }
            }
      };
    })
  );

const _createSummary = (iocDetails, assets, events) => {
  const iocDetailsTags =
    iocDetails &&
    iocDetails.iocSources &&
    _.compact([
      iocDetails.iocSources[0].confidenceScore &&
        `Confidence: ${iocDetails.iocSources[0].confidenceScore}`,
      iocDetails.iocSources[0].category &&
        `Category: ${iocDetails.iocSources[0].category}`,
      iocDetails.iocSources[0].category &&
        `Severity: ${iocDetails.iocSources[0].rawSeverity}`,
      `# of IOC: ${iocDetails.iocSources.length}`
    ]);

  const assetsTags = assets && assets.assets && `# of Assets: ${assets.assets.length}`;
  const eventsTags = events && events.events && `# of Events: ${events.events.length}`;

  return _.chain([iocDetailsTags, assetsTags, eventsTags])
    .flatten()
    .compact()
    .thru((tags) => tags.length === 1 && tags[0].startsWith('# of Assets: ') ? [] : tags)
    .value();
};

module.exports = createLookupResults;