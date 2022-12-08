'use strict';

const validateOptions = require('./helpers/validateOptions');
const createRequestWithDefaults = require('./helpers/createRequestWithDefaults');
const { parseErrorToReadableJSON } = require('./helpers/dataTransformations');

const { handleError } = require('./helpers/handleError');
const { getLookupResults } = require('./helpers/getLookupResults');

let Logger;
let requestWithDefaults;
const startup = (logger) => {
  Logger = logger;
  requestWithDefaults = createRequestWithDefaults(Logger);
};

const doLookup = async (entities, options, cb) => {
  Logger.debug({ entities }, 'Entities');

  let lookupResults;
  try {
    lookupResults = await getLookupResults(
      entities,
      options,
      requestWithDefaults,
      Logger
    );
  } catch (error) {
    const err = parseErrorToReadableJSON(error);
    Logger.error({ error, formattedError: err }, 'Get Lookup Results Failed');
    return cb(handleError(error));
  }
  Logger.trace({ lookupResults }, 'lookupResults');
  cb(null, lookupResults);
};

module.exports = {
  doLookup,
  startup,
  validateOptions
};
