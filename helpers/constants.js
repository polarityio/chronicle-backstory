const IGNORED_IPS = new Set(['127.0.0.1', '255.255.255.255', '0.0.0.0']);

const IOC_ARTIFACT_TYPES = {
  domain: 'domain_name',
  ip: 'destination_ip_address'
};

const ASSET_ARTIFACT_TYPES = {
  domain: 'domain_name',
  ip: 'destination_ip_address',
  md5: 'hash_md5',
  sha1: 'hash_sha1',
  sha256: 'hash_sha256'
};

const EVENT_INDICATOR_TYPES = {
  domain: 'hostname',
  ip: 'asset_ip_address',
  mac: 'mac'
};

module.exports = {
  IGNORED_IPS,
  IOC_ARTIFACT_TYPES,
  ASSET_ARTIFACT_TYPES,
  EVENT_INDICATOR_TYPES
};
