const {
  _P,
  partitionFlatMap,
  splitOutIgnoredIps,
  groupEntities
} = require('./dataTransformations');

const getIocDetails = require('./getIocDetails');
const getAssets = require('./getAssets');
const getEvents = require('./getEvents');

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } = splitOutIgnoredIps(
        _entitiesPartition
      );
      const entityGroups = groupEntities(entitiesPartition, options);

      const { iocDetails, assets, events } = await _P.parallel({
        iocDetails: getIocDetails(entityGroups, options, requestWithDefaults, Logger),
        assets: getAssets(entityGroups, options, requestWithDefaults, Logger),
        events: getEvents(entityGroups, options, requestWithDefaults, Logger)
      });

      Logger.trace({ iocDetails, assets, events }, 'Query Results');

      const lookupResults = [];
      return lookupResults.concat(ignoredIpLookupResults);
    },
    20,
    entities
  );

module.exports = {
  getLookupResults
};
