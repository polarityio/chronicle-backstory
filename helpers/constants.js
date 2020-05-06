const IGNORED_IPS = new Set(['127.0.0.1', '255.255.255.255', '0.0.0.0']);

const IOC_ARTIFACT_TYPES = {
  domain: 'domain_name',
  ip: 'destination_ip_address'
};

module.exports = {
  IGNORED_IPS,
  IOC_ARTIFACT_TYPES
};
