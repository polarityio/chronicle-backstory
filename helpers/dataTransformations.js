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
    .groupBy(({ isIP, isDomain, type }) =>
      isIP ? "ip" : 
      isDomain ? "domain" : 
      type === "MAC" ? "mac" : 
      type === "MD5" ? "md5" : 
      type === "SHA1" ? "sha1" : 
      type === "SHA256" ? "sha256" : 
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

module.exports = {
  _P,
  partitionFlatMap,
  getKeys,
  groupEntities,
  splitOutIgnoredIps,
  generateTimes
};
