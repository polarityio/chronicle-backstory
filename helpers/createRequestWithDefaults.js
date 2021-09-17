const fs = require("fs");
const request = require("request");
const { promisify } = require("util");

const config = require("../config/config");

const getAuthToken = require('./getAuthToken');
const { checkForInternalServiceError } = require('./handleError');

const _configFieldIsValid = (field) =>
  typeof field === "string" && field.length > 0;

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
    preRequestFunction = () => ({}),
    postRequestSuccessFunction = (x) => x,
    postRequestFailureFunction = (e) => { throw e; }
  ) => async ({ json: bodyWillBeJSON, ...requestOptions }) => {
    const _requestWithDefault = promisify(request.defaults(defaults));
    const preRequestFunctionResults = await preRequestFunction(requestOptions);
    const _requestOptions = {
      ...requestOptions,
      ...preRequestFunctionResults,
    };

    let postRequestFunctionResults;
    try {
      const { body, ...result } = await _requestWithDefault(_requestOptions);

      checkForStatusError({ body, ...result });

      postRequestFunctionResults = await postRequestSuccessFunction({
        ...result,
        body: bodyWillBeJSON ? JSON.parse(body) : body,
      });
    } catch (error) {
      postRequestFunctionResults = await postRequestFailureFunction(
        error,
        _requestOptions
      );
    }

    return postRequestFunctionResults;
  };

  const handleAuth = async (requestOptions) => {
    const token = await getAuthToken(
      requestOptions.options,
      requestWithDefaults(),
      Logger
    ).catch((error) => {
      Logger.error({ error }, 'Unable to retrieve Auth Token');
      throw error;
    });

    Logger.trace({ token }, 'Token');

    return {
      ...requestOptions,
      headers: {
        ...requestOptions.headers,
        Authorization: `Bearer ${token}`,
        Host: requestOptions.options.domain
      }
    };
  };

  const checkForStatusError = ({ statusCode, body }, requestOptions) => {
    checkForInternalServiceError(statusCode, body);
    if (Math.round(statusCode / 100) * 100 !== 200) {
      const requestError = Error("Request Error");
      requestError.status = statusCode;
      requestError.description = body;
      requestError.requestOptions = requestOptions;
      throw requestError;
    }
  };

  return requestWithDefaults(handleAuth);
};

module.exports = createRequestWithDefaults;
