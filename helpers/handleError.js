const STATUS_CODE_ERROR_MESSAGE = {
  400: (error) => ({
    err: error.message,
    detail: error.description
  }),
  401: (error) => ({
    err: 'Unauthorized',
    detail: 'Unable to retrieve Auth Token -> ' + `${error.description}`
  }),
  404: (error) => ({
    err: 'Not Found',
    detail:
      'Requested item doesn’t exist or not enough access permissions -> ' +
      `${error.description}`
  }),
  500: (error) => ({
    err: 'Server Error',
    detail: 'Unexpected Server Error -> ' + `${error.description}`
  }),
  jwtCreationError: (error) => ({
    err: 'Problem Creating JWT with Private Key',
    detail: 'Problem With Private Key -> ' + `${error.message}`
  }),
  unknown: (error) =>
    error.message.includes('getaddrinfo ENOTFOUND')
      ? {
          err: 'Url Not Found',
          detail: `The Url you used in options was Not Found -> ${error.message}`
        }
      : error.message.includes('self signed certificate')
      ? {
          err: 'Problem with Certificate',
          detail: `A Problem was found with your Certificate -> ${error.message}`
        }
      : {
          err: 'Unknown',
          detail: error.message
        }
};

const handleError = (error) =>
  (
    STATUS_CODE_ERROR_MESSAGE[error.status] ||
    STATUS_CODE_ERROR_MESSAGE[Math.round(error.status / 10) * 10] ||
    STATUS_CODE_ERROR_MESSAGE['unknown']
  )(error);

const checkForInternalServiceError = (statusCode, response) => {
  const { error, error_description } = response;
  if (error) {
    if (typeof error === "string") {
      const internalServiceError = Error(`Internal Service Error: ${error}`);
      internalServiceError.status = statusCode;
      internalServiceError.description = `${error} -> ${error_description}`;
      throw internalServiceError;
    }
    const internalServiceError = Error('Internal Service Error');
    internalServiceError.status = statusCode;
    internalServiceError.description = `${error.status} -> ${error.message}`;
    throw internalServiceError;

  }
  return response;
};

module.exports = { handleError, checkForInternalServiceError };
