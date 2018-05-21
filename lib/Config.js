import Configstore from 'configstore';

const config = {
  configStore: new Configstore('ethstats-cli'),
  configurator: {
    url: 'https://config.net.ethstats.io:443'
  },
  server: {
    net: 'mainnet'
  },
  client: {
    url: 'http://localhost:8545'
  },
  logger: {
    showErrors: true,
    showInfos: false,
    showDebugs: false
  }
};

export default config;
