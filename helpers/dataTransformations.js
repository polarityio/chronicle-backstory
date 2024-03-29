const _ = require("lodash");
const Aigle = require("aigle");
const moment = require('moment');

const { IGNORED_IPS } = require('./constants');

const _P = Aigle.mixin(_);


const partitionFlatMap = (func, partitionSize, collection, parallelLimit = 10) =>
  _P
    .chain(collection)
    .chunk(partitionSize)
    .map((x) => async () => func(x))
    .thru((x) => Aigle.parallelLimit(x, parallelLimit))
    .flatten()
    .value();

const getKeys = (keys, items) =>
  Array.isArray(items)
    ? items.map((item) => _.pickBy(item, (v, key) => keys.includes(key)))
    : _.pickBy(items, (v, key) => keys.includes(key));

const groupEntities = (entities) =>
  _.chain(entities)
    .groupBy(({ isIP, isDomain, type, isSHA256, isSHA1, isMD5 }) =>
      isIP ? "ip" : 
      isDomain ? "domain" : 
      type === "MAC" ? "mac" :
      isMD5 ? "md5" :
      isSHA1 ? "sha1" :
      isSHA256 ? "sha256" :
      "unknown"
    )
    .omit("unknown")
    .value();


const splitOutIgnoredIps = (_entitiesPartition) => {
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

const generateTimes = ({ daysBack }, queryingEvents = false) => {
  const hoursBack = daysBack * 24;
  const daysBackDateTime =
    moment
      .utc()
      .subtract(Math.abs(hoursBack), 'hours')
      .format('YYYY-MM-DDTHH:mm:ssZ');

  return {
    start_time: daysBackDateTime,
    end_time: moment.utc().format('YYYY-MM-DDTHH:mm:ssZ'),
    ...(queryingEvents && { reference_time: daysBackDateTime })
  };
};


const parseErrorToReadableJSON = (error) =>
  JSON.parse(JSON.stringify(error, Object.getOwnPropertyNames(error)));

module.exports = {
  _P,
  partitionFlatMap,
  getKeys,
  groupEntities,
  splitOutIgnoredIps,
  generateTimes,
  parseErrorToReadableJSON
};
