import Configstore from 'configstore';

const config = {
  configStore: new Configstore('ethstats-cli'),
  socketServer: {
    host: 'http://52.174.250.188',
    port: '25384'
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
