import net from 'net';
import Web3 from 'web3';
import Abstract from './Abstract.js';

export default class WebSocket extends Abstract {

  constructor(diContainer) {
    super(diContainer);

    this.web3 = new Web3();

    this.web3.isConnected = () => {
      let result = false;

      return this.web3.eth.getProtocolVersion().then((data) => {
        if (data) {
          result = true;
        }

        return result;
      }).catch((error) => {
        if (error.message !== 'connection not open') {
          this.log.error(this.errorHandler.resolve(error));
        }

        return result;
      });
    };
  }

  setProvider() {
    if (this.protocol === 'ipc') {
      this.web3.setProvider(new Web3.providers.IpcProvider(this.url, net));
    } else {
      this.web3.setProvider(new Web3.providers.WebsocketProvider(this.url));
    }
  }

  connect() {
    this.log.echo(`Setting Web3 provider to "${this.url}"`);
    this.setProvider();

    this.web3.isConnected().then((result) => {
      if (!result) {
        this.log.warning('No connection found with the node. Waiting to connect...');
      }
    });

    this.checkConnection();

    if (this.connectionInterval === null) {
      this.connectionInterval = setInterval(() => {
        this.checkConnection();
      }, this.CONNECTION_INTERVAL);
    }
  }

  checkConnection() {
    this.log.debug('Check connection');

    this.web3.isConnected().then((isConnected) => {
      if (isConnected) {
        if (!this.isConnected) {
          this.isConnected = true;
          this.lastBlock = null;
          this.start();
          this.log.echo('Connection established with the node');
        }
        if (!this.server.isLoggedIn) {
          this.getLoginInfo().then((loginInfos) => {
            this.server.login(loginInfos);
          });
        }
      } else {
        if (this.isConnected) {
          this.isConnected = false;
          this.stop();
          this.log.warning('Connection lost with the node. Waiting to reconnect...');
        } else {
          this.setProvider();
        }
        if (this.server.isLoggedIn) {
          this.server.logout();
        }
      }
    });
  }

  getLoginInfo() {
    let result = {
      nodeName: this.config.configStore.get('nodeName'),
      secretKey: this.config.configStore.get('secretKey'),
      coinbase: null,
      node: null,
      net: null,
      protocol: null,
      api: this.web3.version,
      os: this.os.type(),
      osVersion: this.os.release(),
      client: this.pkg.version
    };

    let allPromises = [];

    let coinbase = this.web3.eth.getCoinbase().then((data) => {
      if (data) {
        return data.toString();
      } else {
        return null;
      }
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
    allPromises.push(coinbase);

    let nodeInfo = this.web3.eth.getNodeInfo().then((data) => {
      if (data) {
        return data.toString();
      } else {
        return null;
      }
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
    allPromises.push(nodeInfo);

    let networkId = this.web3.eth.net.getId().then((data) => {
      if (data) {
        return data.toString();
      } else {
        return null;
      }
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
    allPromises.push(networkId);

    let protocolVersion = this.web3.eth.getProtocolVersion().then((data) => {
      if (data) {
        return data.toString();
      } else {
        return null;
      }
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
    allPromises.push(protocolVersion);

    return Promise.all(allPromises).then((promiseResults) => {
      result.coinbase = promiseResults[0];
      result.node = promiseResults[1];
      result.net = promiseResults[2];
      result.protocol = promiseResults[3];

      return result;
    });
  }

  start() {
    this.log.debug('Start client');

    this.statsInterval = setInterval(() => {
      this.getStats();
    }, this.STATS_INTERVAL);

    this.web3.eth.subscribe('newBlockHeaders').on('data', (blockHeader) => {
      if (blockHeader) {
        this.log.debug(`Got block: "${blockHeader.number}"`);
        this.blocksQueue.push(blockHeader.hash);
      }
    }).on('error', (error) => {
      this.log.error(this.errorHandler.resolve(error));
    });

    this.web3.eth.subscribe('syncing').on('changed', (isSyncing) => {
      this.syncStatus(isSyncing);
    }).on('data', (syncInfo) => {
      if (syncInfo) {
        this.syncStatus(syncInfo);
      }
    }).on('error', (error) => {
      this.log.error(this.errorHandler.resolve(error));
    });
  }

  stop() {
    this.log.debug('Stop client');
    clearInterval(this.statsInterval);
  }

  getStats() {
    this.log.debug('Get stats');

    let result = {
      peers: 0,
      gasPrice: null,
      mining: false,
      hashrate: 0
    };

    let allPromises = [];

    let peers = this.web3.eth.net.getPeerCount().then((data) => {
      if (data) {
        return data;
      } else {
        return 0;
      }
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return 0;
    });
    allPromises.push(peers);

    let gasPrice = this.web3.eth.getGasPrice().then((data) => {
      if (data) {
        return data.toString();
      } else {
        return null;
      }
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
    allPromises.push(gasPrice);

    let mining = this.web3.eth.isMining().then((data) => {
      if (data) {
        return data;
      } else {
        return false;
      }
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return false;
    });
    allPromises.push(mining);

    let hashrate = this.web3.eth.getHashrate().then((data) => {
      if (data) {
        return data;
      } else {
        return 0;
      }
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return 0;
    });
    allPromises.push(hashrate);

    return Promise.all(allPromises).then((promiseResults) => {
      result.peers = promiseResults[0];
      result.gasPrice = promiseResults[1];
      result.mining = promiseResults[2];
      result.hashrate = promiseResults[3];

      this.server.send('stats', result);

      return result;
    });
  }

  getBlock(number, asyncCallback) {
    this.web3.eth.getBlock(number, false).then((block) => {
      if (block) {
        this.processBlock(block);
      }

      if (asyncCallback) {
        asyncCallback();
      }
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));

      if (asyncCallback) {
        asyncCallback();
      }
    });
  }

  getBlockHashes(blockNumbers) {
    let result = [];
    let allPromises = [];

    for (let i = 0; i < blockNumbers.length; i++) {
      allPromises.push(this.web3.eth.getBlock(blockNumbers[i], false));
    }

    return Promise.all(allPromises).then((blocks) => {
      for (let i = 0; i < blocks.length; i++) {
        let block = blocks[i];

        if (block === null) {
          this.log.error(`Could not get block "${blockNumbers[i]}". Your node might be not fully synced.`, false, true);
        }

        result.push({
          number: block.number,
          hash: block.hash
        });
      }

      this.server.send('checkChain', result);
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
    });
  }

}
