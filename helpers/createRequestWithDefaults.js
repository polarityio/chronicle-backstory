const fs = require("fs");
const { identity } = require("lodash/fp");
const request = require("postman-request");

const config = require("../config/config");

const getAuthToken = require('./getAuthToken');
const { parseErrorToReadableJSON } = require('./dataTransformations');
const { checkForInternalServiceError } = require('./handleError');

const _configFieldIsValid = (field) =>
  typeof field === "string" && field.length > 0;

const SUCCESSFUL_ROUNDED_REQUEST_STATUS_CODES = [200];


const createRequestWithDefaults = (Logger) => {
  const {
    request: { ca, cert, key, passphrase, rejectUnauthorized, proxy }
  } = config;

  const defaults = {
    ...(_configFieldIsValid(ca) && { ca: fs.readFileSync(ca) }),
    ...(_configFieldIsValid(cert) && { cert: fs.readFileSync(cert) }),
    ...(_configFieldIsValid(key) && { key: fs.readFileSync(key) }),
    ...(_configFieldIsValid(passphrase) && { passphrase }),
    ...(_configFieldIsValid(proxy) && { proxy }),
    ...(typeof rejectUnauthorized === "boolean" && { rejectUnauthorized }),
    json: true
  };

  const requestWithDefaults = (
    preRequestFunction = async () => ({}),
    postRequestSuccessFunction = async (x) => x,
    postRequestFailureFunction = async (e) => {
      throw e;
    }
  ) => {
    const defaultsRequest = request.defaults(defaults);

    const _requestWithDefault = (requestOptions) =>
      new Promise((resolve, reject) => {
        defaultsRequest(requestOptions, (err, res, body) => {
          if (err) return reject(err);
          resolve({ ...res, body });
        });
      });

    return async ({ json: bodyWillBeJSON, ...requestOptions }) => {
      const preRequestFunctionResults = await preRequestFunction(requestOptions);
      const _requestOptions = {
        ...requestOptions,
        ...preRequestFunctionResults
      };

      let postRequestFunctionResults;
      try {
        const result = await _requestWithDefault(_requestOptions);
        checkForStatusError(result, _requestOptions);

        postRequestFunctionResults = await postRequestSuccessFunction(
          {
            ...result,
            body: (bodyWillBeJSON ? JSON.parse : identity)(result.body)
          },
          _requestOptions
        );
      } catch (error) {
        postRequestFunctionResults = await postRequestFailureFunction(
          error,
          _requestOptions
        );
      }
      return postRequestFunctionResults;
    };
  };

  const handleAuth = async (requestOptions) => {
    const token = await getAuthToken(
      requestOptions.options,
      requestWithDefaults(),
      Logger
    ).catch((error) => {
      const err = parseErrorToReadableJSON(error);
      //TODO: test logs by messing up keys and setting logging level to trace
      Logger.error({ error, formattedError: err }, 'Unable to retrieve Auth Token');
      throw error;
    });

    Logger.trace({ token }, 'Token');

    return {
      ...requestOptions,
      headers: {
        ...requestOptions.headers,
        Authorization: token ? `Bearer ${token}` : "Authentication Failed.  Check Logs for more information.",
        Host: requestOptions.options.domain
      }
    };
  };

  const checkForStatusError = ({ statusCode, body }, requestOptions) => {
    const requestOptionsWithoutSensitiveData = {
      ...requestOptions,
      options: '************'
    };

    Logger.trace({
      MESSAGE: 'checkForStatusError',
      statusCode,
      requestOptions: requestOptionsWithoutSensitiveData,
      body
    });

    checkForInternalServiceError(statusCode, body);

    const roundedStatus = Math.round(statusCode / 100) * 100;
    if (!SUCCESSFUL_ROUNDED_REQUEST_STATUS_CODES.includes(roundedStatus)) {
      const requestError = Error('Request Error');
      requestError.status = statusCode;
      requestError.description = JSON.stringify(body);
      requestError.requestOptions = JSON.stringify(requestOptionsWithoutSensitiveData);
      throw requestError;
    }
  };

  const requestDefaultsWithInterceptors = requestWithDefaults(handleAuth);

  return requestDefaultsWithInterceptors;
};

module.exports = createRequestWithDefaults;
