const jwt = require('jsonwebtoken');
const _ = require('lodash');

const config = require('../config/config');
const { parseErrorToReadableJSON } = require('./dataTransformations');


const NodeCache = require('node-cache');
const cache = new NodeCache({
  stdTTL: 59 * 60
});

const getAuthToken = async ({ issuerEmail, privateKey }, requestWithDefaults, Logger) => {
  const processedPrivateKey = _processPrivateKey(privateKey);
  const cachedAccessToken = cache.get(`${issuerEmail}${processedPrivateKey}`);

  if (cachedAccessToken) return cachedAccessToken;

  let createdAndSignedJWT;
  try {
    const { request: { passphrase } } = config;

    createdAndSignedJWT = jwt.sign(
      {
        iss: issuerEmail,
        scope: 'https://www.googleapis.com/auth/chronicle-backstory',
        aud: 'https://oauth2.googleapis.com/token'
      },
      passphrase ? { key: processedPrivateKey, passphrase } : processedPrivateKey,
      { algorithm: 'RS256', expiresIn: '1h' }
    );
  } catch (error) {
    error.status = 'jwtCreationError';
    const err = parseErrorToReadableJSON(error);
    Logger.error({ error, formattedError: err }, 'Error Creating JWT');
    throw error;
  }

  const { body } = await requestWithDefaults({
    url: `https://oauth2.googleapis.com/token`,
    method: 'POST',
    headers: {
      'Content-type': 'application/x-www-form-urlencoded'
    },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${createdAndSignedJWT}`
  });

  if (body.access_token)
    cache.set(`${issuerEmail}${processedPrivateKey}`, body.access_token);

  return body.access_token;
};

const _processPrivateKey = (privateKey) =>
  _.chain(privateKey)
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .split(' ')
    .flatMap((x) => x.split('\\n'))
    .flatMap((x) => x.split('\n'))
    .compact()
    .join('\n')
    .thru(
      (keyWithoutWrapper) =>
        `-----BEGIN PRIVATE KEY-----\n${keyWithoutWrapper}\n-----END PRIVATE KEY-----\n`
    )
    .value();

module.exports = getAuthToken;
