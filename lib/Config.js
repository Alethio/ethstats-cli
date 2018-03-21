import Configstore from 'configstore';

const config = {
  configStore: new Configstore('ethstats-cli'),
  configServer: {
    host: 'https://config.net.ethstats.io',
    port: '25384'
  },
  rpcServer: {
    host: 'http://localhost',
    port: '8545'
  },
  defaultNet: 'mainnet',
  logger: {
    showErrors: true,
    showInfos: false,
    showDebugs: false
  }
};

export default config;
