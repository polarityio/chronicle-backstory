const _ = require("lodash");

const validateOptions = (options, callback) => {
  const stringOptionsErrorMessages = {
    issuerEmail: 'You must provide a valid Issuer Email from your Google Service Account',
    privateKey: 'You must provide a valid Private Key from your Google Service Account'
  };

  const stringValidationErrors = _validateStringOptions(
    stringOptionsErrorMessages,
    options
  );

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
