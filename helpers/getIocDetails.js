const _ = require('lodash');
const moment = require('moment');

const { IOC_ARTIFACT_TYPES } = require('./constants');

const { _P } = require('./dataTransformations');

const getIocDetails = (entityGroups, options, requestWithDefaults, Logger) =>
  _P
    .chain(entityGroups)
    .pick(['ip', 'domain'])
    /* NOTE: It is possible to make this more efficient using _P.parrallel by running queries in parallel and parsing results after
     * only execute in parallel if entity group size is over a certain threshhold (e.g. 10 entities)
     */
    .reduce(
      async (agg, entityGroup, entityType) => ({
        ...agg,
        ...(await _P.reduce(
          entityGroup,
          async (agg, entity) => {
            const { body: iocDetails } = await requestWithDefaults({
              url: 'https://backstory.googleapis.com/v1/artifact/listiocdetails',
              options,
              qs: {
                [`artifact.${IOC_ARTIFACT_TYPES[entityType]}`]: entity.value
              }
            });

            const valueReturned =
              iocDetails &&
              ((iocDetails.uri && iocDetails.uri.length) ||
                (iocDetails.sources && iocDetails.sources.length));

            return !valueReturned
              ? agg
              : _formatIocDetails(agg, iocDetails, entity.value);
          },
          {}
        ))
      }),
      {}
    )
    .value();

const _formatIocDetails = (agg, iocDetails, entityValue) => {
  const uri = iocDetails.uri && { iocLink: iocDetails.uri[0] };

  const iocSources = 
    iocDetails.sources &&
    iocDetails.sources.length && 
    iocDetails.sources.map(
      ({
        confidenceScore: _confidenceScore,
        addresses,
        firstActiveTime,
        lastActiveTime,
        ...source
      }) => {
        const { strRawConfidenceScore: confidenceScore } = 
          _confidenceScore || 
          { strRawConfidenceScore: null };

        const formattedAddresses = addresses && addresses.length && 
          _.flatMap(addresses, (address) =>
            _.map(address, (addressValue, addressKey) => ({
              type: _.startCase(addressKey),
              address:
                _.isArray(addressValue) && addressValue.length
                  ? addressValue.join(', ')
                  : addressValue
            }))
          );

        return {
          ...source,
          ...( confidenceScore && { confidenceScore }),
          ...( formattedAddresses && { addresses: formattedAddresses }),
          ...( firstActiveTime && {
            firstActiveTime: moment(firstActiveTime).format('MMM DD YYYY, h:mm A')
          }),
          ...( lastActiveTime && {
            lastActiveTime: moment(lastActiveTime).format('MMM DD YYYY, h:mm A')
          })
        };
      }
    ).filter(_.negate(_.isEmpty));

  return {
    ...agg,
    [entityValue]: {
      ...uri,
      ...(iocSources && iocSources.length && { iocSources })
    }
  };
};


module.exports = getIocDetails;