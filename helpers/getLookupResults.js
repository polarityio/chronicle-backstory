const {
  _P,
  partitionFlatMap,
  splitOutIgnoredIps,
  groupEntities
} = require('./dataTransformations');

const getIocDetails = require('./getIocDetails');
const getAssets = require('./getAssets');
const getEvents = require('./getEvents');
const createLookupResults = require('./createLookupResults');

/**
 * Used to check if a user has a particular source enabled.  The sources are defined in the integration's config.js
 * as part of the 'sourcesToSearch' integration option.
 *
 * @param source {string} One of 'iocDetails', 'assets', or 'events'
 * @param options User options for the integration
 * @returns {boolean} true if the specified source is enabled, false if not
 */
const isSourceEnabled = (source, options) => {
  const result = options.sourcesToSearch.find((optionSource) => {
    return optionSource.value === source;
  });
  return result ? true : false;
};

/**
 * Async method that returns an empty object.  This is used
 * to skip searching a particular data source based on the user defined
 * options.sourcesToSearch values.
 *
 * @returns {Promise<{}>}
 */
const skipSearch = async () => {
  return {};
};

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } =
        splitOutIgnoredIps(_entitiesPartition);
      const entityGroups = groupEntities(entitiesPartition, options);

      const { iocDetails, assets, events } = await _P.parallel({
        iocDetails: isSourceEnabled('iocDetails', options)
          ? getIocDetails(entityGroups, options, requestWithDefaults, Logger)
          : skipSearch,
        assets: isSourceEnabled('assets', options)
          ? getAssets(entityGroups, options, requestWithDefaults, Logger)
          : skipSearch,
        events: isSourceEnabled('events', options)
          ? getEvents(entityGroups, options, requestWithDefaults, Logger)
          : skipSearch
      });

      const lookupResults = createLookupResults(
        options,
        entityGroups,
        iocDetails,
        assets,
        events
      );

      Logger.trace({ iocDetails, assets, events, lookupResults }, 'Query Results');

      return lookupResults.concat(ignoredIpLookupResults);
    },
    20,
    entities
  );

module.exports = {
  getLookupResults
};
