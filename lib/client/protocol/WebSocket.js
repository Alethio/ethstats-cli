import net from 'net';
import Web3 from 'web3';
import Abstract from './Abstract.js';

export default class WebSocket extends Abstract {
  constructor(diContainer) {
    super(diContainer);

    if (this.protocol === 'ipc') {
      this.web3 = new Web3(new Web3.providers.IpcProvider(this.url, net));
    } else {
      this.web3 = new Web3(new Web3.providers.WebsocketProvider(this.url));
    }

    this.web3.isConnected = () => {
      let result = false;

      return this.web3.eth.getProtocolVersion().then(data => {
        if (data) {
          result = true;
        }

        return result;
      }).catch(error => {
        if (error.message !== 'connection not open') {
          this.log.error(this.errorHandler.resolve(error));
        }

        return result;
      });
    };
  }

  setProvider() {
    this.log.debug(`Setting Web3 provider to "${this.url}"`);

    if (this.protocol === 'ipc') {
      this.web3.setProvider(new Web3.providers.IpcProvider(this.url, net));
    } else {
      this.web3.setProvider(new Web3.providers.WebsocketProvider(this.url));
    }
  }

  connect() {
    this.web3.isConnected().then(result => {
      if (!result) {
        this.log.echo(`Connecting to node "${this.url}"`);
        this.setProvider();
        this.checkConnection();
      }
    });

    if (this.connectionInterval === null) {
      this.connectionInterval = setInterval(() => {
        this.checkConnection();
      }, this.CONNECTION_INTERVAL);
    }
  }

  checkConnection() {
    this.web3.isConnected().then(isConnected => {
      this.log.debug(`Check node connection => ${isConnected}`);

      if (isConnected) {
        if (!this.isConnected) {
          this.isConnected = true;
          this.lastBlock = null;
          this.start();
          this.log.echo('Connection established with the node');
        }

        if (!this.server.isLoggedIn) {
          this.getLoginInfo().then(loginInfos => {
            this.usage.setNodeProcessName(loginInfos.node);
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
      client: this.pkg.version,
      cpu: null,
      memory: null,
      disk: null
    };

    let allPromises = [];

    let coinbase = this.web3.eth.getCoinbase().then(data => {
      if (data) {
        return data.toString();
      }

      return null;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
    allPromises.push(coinbase);

    let nodeInfo = this.web3.eth.getNodeInfo().then(data => {
      if (data) {
        return data.toString();
      }

      return null;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
    allPromises.push(nodeInfo);

    let networkId = this.web3.eth.net.getId().then(data => {
      if (data) {
        return data.toString();
      }

      return null;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
    allPromises.push(networkId);

    let protocolVersion = this.web3.eth.getProtocolVersion().then(data => {
      if (data) {
        return data.toString();
      }

      return null;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
    allPromises.push(protocolVersion);

    allPromises.push(this.hwInfo.getCpuInfo());
    allPromises.push(this.hwInfo.getMemoryInfo());
    allPromises.push(this.hwInfo.getDiskInfo());

    return Promise.all(allPromises).then(promiseResults => {
      result.coinbase = promiseResults[0];
      result.node = promiseResults[1];
      result.net = promiseResults[2];
      result.protocol = promiseResults[3];
      result.cpu = promiseResults[4];
      result.memory = promiseResults[5];
      result.disk = promiseResults[6];

      return result;
    });
  }

  start() {
    this.log.debug('Start client');

    this.statsInterval = setInterval(() => {
      this.getStats();
    }, this.STATS_INTERVAL);

    this.usageInterval = setInterval(() => {
      this.usage.getStats();
    }, this.USAGE_INTERVAL);

    this.web3.eth.subscribe('newBlockHeaders').on('data', blockHeader => {
      if (blockHeader) {
        this.log.debug(`Got block: "${blockHeader.number}"`);
        this.blocksQueue.push(blockHeader.hash);
      }
    }).on('error', error => {
      this.log.error(this.errorHandler.resolve(error));
    });

    this.web3.eth.subscribe('syncing').on('changed', isSyncing => {
      this.syncStatus(isSyncing);
    }).on('data', syncInfo => {
      if (syncInfo) {
        this.syncStatus(syncInfo);
      }
    }).on('error', error => {
      this.log.error(this.errorHandler.resolve(error));
    });
  }

  stop(stopConnectionInterval = false) {
    this.log.debug('Stop client');

    if (stopConnectionInterval) {
      clearInterval(this.connectionInterval);
    }

    clearInterval(this.statsInterval);
    clearInterval(this.usageInterval);
  }

  getStats() {
    this.log.debug('Get stats');

    let result = {
      peers: 0,
      gasPrice: 0,
      mining: false,
      hashrate: 0,
      pendingTXs: 0
    };

    let allPromises = [];

    let peers = this.web3.eth.net.getPeerCount().then(data => {
      if (data) {
        return data;
      }

      return 0;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return 0;
    });
    allPromises.push(peers);

    let gasPrice = this.web3.eth.getGasPrice().then(data => {
      if (data) {
        return data.toString();
      }

      return 0;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return 0;
    });
    allPromises.push(gasPrice);

    let mining = this.web3.eth.isMining().then(data => {
      if (data) {
        return data;
      }

      return false;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return false;
    });
    allPromises.push(mining);

    let hashrate = this.web3.eth.getHashrate().then(data => {
      if (data) {
        return data;
      }

      return 0;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return 0;
    });
    allPromises.push(hashrate);

    let pendingTXs = this.web3.eth.getBlockTransactionCount('pending').then(data => {
      if (data) {
        return data;
      }

      return 0;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return 0;
    });
    allPromises.push(pendingTXs);

    return Promise.all(allPromises).then(promiseResults => {
      result.peers = promiseResults[0];
      result.gasPrice = promiseResults[1];
      result.mining = promiseResults[2];
      result.hashrate = promiseResults[3];
      result.pendingTXs = promiseResults[4];

      this.server.send('stats', result);

      return result;
    });
  }

  getBlock(number, asyncCallback) {
    this.web3.eth.getBlock(number, false).then(block => {
      if (block) {
        this.processBlock(block);
      }

      if (asyncCallback) {
        asyncCallback();
      }
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));

      if (asyncCallback) {
        asyncCallback();
      }
    });
  }

  getBlockHashes(blockNumber) {
    let result = {
      blockNumber: null,
      blockHash: null,
      blockParentHash: null
    };

    this.web3.eth.getBlock(blockNumber, false).then(block => {
      if (block === null) {
        this.log.error(`Could not get block "${blockNumber}". Your node might be not fully synced.`, false, true);
      } else {
        result.blockNumber = parseInt(block.number, 10);
        result.blockHash = block.hash.toString();
        result.blockParentHash = block.parentHash.toString();
      }

      this.server.send('checkChainData', result);
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
    });
  }

  getBlocks(range) {
    let allPromises = range.map(blockNumber => {
      this.log.debug(`History get block: "${blockNumber}"`);
      return this.web3.eth.getBlock(blockNumber, false);
    });

    Promise.all(allPromises).then(results => {
      this.server.send('getBlocksData', results);
    }).catch(error => {
      this.log.error(`Error getting block history: ${error}`);
      this.server.send('getBlocksData', []);
    });
  }

  getValidators(block) {
    let result = {
      blockNumber: block.number,
      blockHash: block.hash,
      validators: []
    };

    this.web3._requestManager.send({method: 'clique_getSignersAtHash', params: [block.hash]}, (error, validators) => {
      if (error) {
        this.log.error(`Could not get validators for block ${block.number}::${block.hash} => ${error.message}`);
      } else {
        result.validators = validators;
        this.server.send('validators', result);
      }
    });
  }
}
