import Configstore from 'configstore';

const config = {
  configStore: new Configstore('ethstats-cli'),
  socketServer: {
    host: 'http://in.ethstats.aleth.io',
    port: '25384' // heypad for aleth
  },
  rpcServer: {
    host: 'http://localhost',
    port: '8545'
  },
  logger: {
    showErrors: true,
    showInfos: false,
    showDebugs: false
  }
};

export default config;
