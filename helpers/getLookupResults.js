const _ = require('lodash');

const { IGNORED_IPS } = require('./constants');

const { _partitionFlatMap } = require('./dataTransformations');

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  _partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } = _splitOutIgnoredIps(
        _entitiesPartition
      );

      const listalerts = await requestWithDefaults({
        url: 'https://backstory.googleapis.com/v1/alert/listalerts',
        options,
        qs: {
          start_time: '2010-12-31T23:59:59.999999999Z',
          end_time: '2020-12-31T23:59:59.999999999Z',
          page_size: '50'
        }
      });

      Logger.trace({ listalerts }, 'List Alerts example request');

      const lookupResults = [];
      return lookupResults.concat(ignoredIpLookupResults);
    },
    20,
    entities
  );

const _splitOutIgnoredIps = (_entitiesPartition) => {
  const { ignoredIPs, entitiesPartition } = _.groupBy(
    _entitiesPartition,
    ({ isIP, value }) =>
      !isIP || (isIP && !IGNORED_IPS.has(value)) ? 'entitiesPartition' : 'ignoredIPs'
  );

  return {
    entitiesPartition,
    ignoredIpLookupResults: _.map(ignoredIPs, (entity) => ({ entity, data: null }))
  };
};

module.exports = {
  getLookupResults
};
