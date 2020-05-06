const _ = require("lodash");
const Aigle = require("aigle");
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

module.exports = {
  partitionFlatMap,
  getKeys,
  groupEntities,
  _P
};
