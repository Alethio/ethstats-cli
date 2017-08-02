import Configstore from 'configstore';

const config = {
  configStore: new Configstore('ethstats-cli'),
  socketServer: {
    host: 'http://localhost',
    port: '3000'
  },
  rpcServer: {
    host: 'http://192.168.0.125',
    port: '8545'
  },
  logger: {
    showErrors: true,
    showInfos: false,
    showDebugs: false
  }
};

export default config;
