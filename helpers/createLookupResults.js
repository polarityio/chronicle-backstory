const _ = require('lodash');

/**
 * Note that if we search for a particular source and there were no results, there will be an empty array for that value
 * If we did not search that result at all (because the user turned off searches for that source, then there will no
 * value at all for the paricular source.
 * ```
 * {
 *   iocSources: [] // means we searched IOCs and there were no results
 * }
 * ```
 *  versus
 *
 * ```
 * { } // means we did not search iocSources because the user turned it off via the options.sourcesToSearch
 * ```
 * @param options
 * @param entityGroups
 * @param iocDetailsMap
 * @param assetsMap
 * @param eventsMap
 * @returns {Array}
 */
const createLookupResults = (
  options,
  entityGroups,
  iocDetailsMap,
  assetsMap,
  eventsMap,
  Logger
) =>
  _.flatMap(entityGroups, (entityGroup, entityType) =>
    _.map(entityGroup, (entity) => {
      const iocDetails = iocDetailsMap[entity.value];
      const assets = assetsMap[entity.value];
      const events = eventsMap[entity.value];

      const iocDetailsResultsFound =
        iocDetails && iocDetails.iocSources && iocDetails.iocSources.length;
      const assetResultsFound = assets && assets.assets && assets.assets.length;
      const eventResultsFound = events && events.events && events.events.length;

      const resultsFound =
        (!options.ignoreAssetResults && assetResultsFound) ||
        iocDetailsResultsFound ||
        eventResultsFound;

      return {
        entity,
        data: !resultsFound
          ? null
          : {
              summary: _createSummary(iocDetails, assets, events, Logger),
              details: {
                ...iocDetails,
                ...assets,
                ...events
              }
            }
      };
    })
  );

const _createSummary = (iocDetails, assets, events, Logger) => {
  let iocDetailsTags;

  if (
    iocDetails &&
    Array.isArray(iocDetails.iocSources) &&
    iocDetails.iocSources.length > 1
  ) {
    iocDetailsTags = [`# of IOCs: ${iocDetails.iocSources.length}`];
  } else {
    iocDetailsTags =
      iocDetails &&
      iocDetails.iocSources &&
      iocDetails.iocSources.length === 1 &&
      _.compact([
        iocDetails.iocSources[0].category &&
          `Category: ${iocDetails.iocSources[0].category}`,
        iocDetails.iocSources[0].category &&
          `Severity: ${iocDetails.iocSources[0].rawSeverity}`
      ]);
  }

  const assetsTags = assets && assets.assets && `# of Assets: ${assets.assets.length}`;
  const eventsTags = events && events.events && `# of Events: ${events.events.length}`;

  return _.chain([iocDetailsTags, assetsTags, eventsTags]).flatten().compact().value();
};

module.exports = createLookupResults;
