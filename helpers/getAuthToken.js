const jwt = require('jsonwebtoken');
const _ = require('lodash');

const NodeCache = require('node-cache');

const cache = new NodeCache({
  stdTTL: 60 * 10
});

const getAuthToken = async ({ issuerEmail, privateKey }, requestWithDefaults, Logger) => {
  const processedPrivateKey = _processPrivateKey(privateKey);
  const cachedAccessToken = cache.get(`${issuerEmail}${processedPrivateKey}`);
  
  if (cachedAccessToken) return cachedAccessToken;

  let createdAndSignedJWT;
  try {
    createdAndSignedJWT = jwt.sign(
      {
        iss: issuerEmail, 
        scope: 'https://www.googleapis.com/auth/chronicle-backstory',
        aud: 'https://oauth2.googleapis.com/token'
      },
      processedPrivateKey,
      { algorithm: 'RS256', expiresIn: '1h' }
    );
  } catch (e) {
    e.status = "jwtCreationError"
    Logger.error({ error: e }, 'Error Creating JWT');
    throw e
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

