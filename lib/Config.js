import Configstore from 'configstore';

const config = {
  configStore: new Configstore('ethstats-cli'),
  configServer: {
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
