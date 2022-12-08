const _ = require('lodash');

const validateOptions = (options, callback) => {
  const stringOptionsErrorMessages = {
    domain:
      'You must provide a valid Chronicle Domain for your Chronicle Backstory instance',
    issuerEmail: 'You must provide a valid Issuer Email from your Google Service Account',
    privateKey: 'You must provide a valid Private Key from your Google Service Account'
  };

  const stringValidationErrors = _validateStringOptions(
    stringOptionsErrorMessages,
    options
  );

  if (options.sourcesToSearch.value.length === 0) {
    stringValidationErrors.push({
      key: 'sourcesToSearch',
      message: 'You must select at least one source to search.'
    });
  }

  callback(null, stringValidationErrors);
};

const _validateStringOptions = (stringOptionsErrorMessages, options, otherErrors = []) =>
  _.reduce(
    stringOptionsErrorMessages,
    (agg, message, optionName) => {
      const isString = typeof options[optionName].value === 'string';
      const isEmptyString = isString && _.isEmpty(options[optionName].value);

      return !isString || isEmptyString
        ? agg.concat({
            key: optionName,
            message
          })
        : agg;
    },
    otherErrors
  );

module.exports = validateOptions;
