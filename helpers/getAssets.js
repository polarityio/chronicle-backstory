const _ = require('lodash');
const moment = require('moment');

const { ASSET_ARTIFACT_TYPES } = require('./constants');

const { _P, generateTimes } = require('./dataTransformations');

const getAssets = async (entityGroups, options, requestWithDefaults) =>
  _P
    .chain(entityGroups)
    .omit(['mac'])
    .reduce(
      async (agg, entityGroup, entityType) => ({
        ...agg,
        ...(await _P.reduce(
          entityGroup,
          async (agg, entity) => {
            const { body: assetList } = await requestWithDefaults({
              url: `https://${options.domain}/v1/artifact/listassets`,
              options,
              qs: {
                [`artifact.${ASSET_ARTIFACT_TYPES[entityType]}`]: entity.value,
                page_size: 25,
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
        ))
      }),
      {}
    )
    .value();

const _formatAssetList = (agg, assetList, entityValue) => {
  const uri = assetList.uri && { assetsLink: assetList.uri[0] };

  const assets =
    assetList.assets &&
    assetList.assets.length &&
    assetList.assets
      .map(({ asset, firstSeenArtifactInfo, lastSeenArtifactInfo }) => {
        const { hostname } = asset || { hostname: null };

        const { artifactIndicator: firstArtifactIndicator, seenTime: firstSeenTime } =
          firstSeenArtifactInfo || { artifactIndicator: null, seenTime: null };

        const { domainName: firstSeenDomainName } = firstArtifactIndicator || {
          domainName: null
        };

        const { artifactIndicator: lastArtifactIndicator, seenTime: lastSeenTime } =
          lastSeenArtifactInfo || { artifactIndicator: null, seenTime: null };

        const { domainName: lastSeenDomainName } = lastArtifactIndicator || {
          domainName: null
        };

        return {
          ...(hostname && { hostname }),
          ...(firstSeenDomainName && { firstSeenDomainName }),
          ...(firstSeenTime && {
            firstSeenTime: moment(firstSeenTime).format('MMM DD YYYY, h:mm A')
          }),
          ...(lastSeenDomainName && { lastSeenDomainName }),
          ...(lastSeenTime && {
            lastSeenTime: moment(lastSeenTime).format('MMM DD YYYY, h:mm A')
          })
        };
      })
      .filter(_.negate(_.isEmpty));

  return {
    ...agg,
    [entityValue]: {
      ...uri,
      // Return empty array if there are no assets found.  Note that this allows us to differentiate between
      // not having searched assets and not having any assets.
      ...(assets && assets.length ? { assets } : { assets: [] })
    }
  };
};

module.exports = getAssets;
