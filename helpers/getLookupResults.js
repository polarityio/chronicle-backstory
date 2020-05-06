const _ = require('lodash');
const moment = require('moment');

const { IGNORED_IPS, IOC_ARTIFACT_TYPES, ASSET_ARTIFACT_TYPES } = require('./constants');

const { partitionFlatMap, groupEntities, _P } = require('./dataTransformations');

const getLookupResults = (entities, options, requestWithDefaults, Logger) =>
  partitionFlatMap(
    async (_entitiesPartition) => {
      const { entitiesPartition, ignoredIpLookupResults } = _splitOutIgnoredIps(
        _entitiesPartition
      );
      const entityGroups = groupEntities(entitiesPartition, options);

      const iocDetails = await getIocDetails(
        entityGroups,
        options,
        requestWithDefaults,
        Logger
      );

      Logger.trace({ iocDetails }, 'IOC Details');

      const assets = await getAssets(entityGroups, options, requestWithDefaults, Logger);

      Logger.trace({ assets }, 'Assets');

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

const getIocDetails = async (entityGroups, options, requestWithDefaults, Logger) =>
  _P
    .chain(entityGroups)
    .omit(['mac', 'md5', 'sha1', 'sha256'])
    .reduce((agg, entityGroup, entityType) => ({
      ...agg,
      ..._P.reduce(entityGroup, async (agg, entity) => {
        const {
          body: iocDetails
        } = await requestWithDefaults({
          url: 'https://backstory.googleapis.com/v1/artifact/listiocdetails',
          options,
          qs: {
            [`artifact.${IOC_ARTIFACT_TYPES[entityType]}`]: entity.value,
            page_size: 50
          }
        });
        
        const valueReturned =
          iocDetails &&
          ((iocDetails.uri && iocDetails.uri.length) ||
            (iocDetails.sources && iocDetails.sources.length));

        return !valueReturned
          ? agg
          : _formatIocDetails(agg, iocDetails, entity.value);
      }, {})
    }), {})
    .value();


const _formatIocDetails = (agg, iocDetails, entityValue) => {
  const uri = iocDetails.uri && { iocLink: iocDetails.uri[0] };

  const sources = iocDetails.sources && {
    iocSources: iocDetails.sources.map(
      ({ firstActiveTime, lastActiveTime, ...source }) => ({
        ...source,
        firstActiveTime: moment(firstActiveTime).format('MMM DD YYYY, h:mm A'),
        lastActiveTime: moment(lastActiveTime).format('MMM DD YYYY, h:mm A')
      })
    )
  };

  return {
    ...agg,
    [entityValue]: {
      ...uri,
      ...sources
    }
  };
};

const getAssets = async (entityGroups, options, requestWithDefaults, Logger) =>
  _P
    .chain(entityGroups)
    .omit(['mac'])
    .reduce(
      (agg, entityGroup, entityType) => ({
        ...agg,
        ..._P.reduce(
          entityGroup,
          async (agg, entity) => {
            const { body: assetList } = await requestWithDefaults({
              url: 'https://backstory.googleapis.com/v1/artifact/listassets',
              options,
              qs: {
                [`artifact.${ASSET_ARTIFACT_TYPES[entityType]}`]: entity.value,
                page_size: 50,
                ...generateTimes(options)
              }
            });

            const valueReturned =
              assetList &&
              ((assetList.uri && assetList.uri.length) ||
                (assetList.assets && assetList.assets.length));

            return !valueReturned ? agg : _formatAssetList(agg, assetList, entity.value);
          },
          {}
        )
      }),
      {}
    )
    .value();
    
const generateTimes = ({ monthsBack }, queryingEvents = false) => {
  const monthsBackDateTime =
    moment
      .utc()
      .subtract(Math.floor(Math.abs(monthsBack)), 'months')
      .subtract((Math.abs(monthsBack) % 1) * 30.41, 'days')
      .format('YYYY-MM-DDTHH:mm:ss') + 'Z';

  return {
    start_time: monthsBackDateTime,
    end_time: moment.utc().format('YYYY-MM-DDTHH:mm:ss') + 'Z',
    ...(queryingEvents && { reference_time: monthsBackDateTime })
  };
};

const _formatAssetList = (agg, assetList, entityValue) => {
  const uri = assetList.uri && { iocLink: assetList.uri[0] };

  const assets = assetList.assets && {
    assets: assetList.assets.map(
      ({
        asset: { hostname },
        firstSeenArtifactInfo: {
          artifactIndicator: { domainName: firstSeenDomainName },
          seenTime: firstSeenTime
        },
        lastSeenArtifactInfo: {
          artifactIndicator: { domainName: lastSeenDomainName },
          seenTime: lastSeenTime
        },
      }) => ({
        hostname,
        firstSeenDomainName,
        firstSeenTime: moment(firstSeenTime).format('MMM DD YYYY, h:mm A'),
        lastSeenDomainName,
        lastSeenTime: moment(lastSeenTime).format('MMM DD YYYY, h:mm A'),
      })
    )
  };

  return {
    ...agg,
    [entityValue]: {
      ...uri,
      ...assets
    }
  };
};

module.exports = {
  getLookupResults
};
