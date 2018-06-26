import Web3 from 'web3js-rpc';
import parallel from 'async/parallel';
import Abstract from './Abstract.js';

export default class Http extends Abstract {

  constructor(diContainer) {
    super(diContainer);

    this.CHECK_LATEST_FILTER_INTERVAL = 300000;
    this.web3 = new Web3();

    this.checkLatestBlocksFilter();
  }

  connect() {
    if (!this.web3.currentProvider) {
      this.log.echo(`Setting Web3 provider to "${this.url}"`);
      this.web3.setProvider(new this.web3.providers.HttpProvider(this.url));
    }

    if (!this.web3.isConnected()) {
      this.log.warning('No connection found with the node. Waiting to connect...');
    }

    this.checkConnection();

    if (this.connectionInterval === null) {
      this.connectionInterval = setInterval(() => {
        this.checkConnection();
      }, this.CONNECTION_INTERVAL);
    }
  }

  checkConnection() {
    this.log.debug('Check connection');

    if (this.web3.isConnected()) {
      if (!this.isConnected) {
        this.isConnected = true;
        this.lastBlock = null;
        this.start();
        this.log.echo('Connection established with the node');
      }
      if (!this.server.isLoggedIn) {
        this.getLoginInfo().then((loginInfos) => {
          this.usage.setNodeProcessName(loginInfos.node);
          this.server.login(loginInfos);
        });
      }
    } else {
      if (this.isConnected) {
        this.isConnected = false;
        this.stop();
        this.log.warning('Connection lost with the node. Waiting to reconnect...');
      }
      if (this.server.isLoggedIn) {
        this.server.logout();
      }
    }
  }

  async getLoginInfo() {
    let result = {
      nodeName: this.config.configStore.get('nodeName'),
      secretKey: this.config.configStore.get('secretKey'),
      coinbase: null,
      node: null,
      net: null,
      protocol: null,
      api: this.web3.version.api,
      os: this.os.type(),
      osVersion: this.os.release(),
      client: this.pkg.version,
      cpu: null,
      memory: null,
      disk: null
    };

    try {
      result.coinbase = this.web3.eth.coinbase;
    } catch (error) {
      this.log.error(this.errorHandler.resolve(error));
    }

    try {
      result.node = this.web3.version.node;
    } catch (error) {
      this.log.error(this.errorHandler.resolve(error));
    }

    try {
      result.net = this.web3.version.network;
    } catch (error) {
      this.log.error(this.errorHandler.resolve(error));
    }

    try {
      result.protocol = this.web3.version.ethereum;
    } catch (error) {
      this.log.error(this.errorHandler.resolve(error));
    }

    result.cpu = await this.hwInfo.getCpuInfo();
    result.memory = await this.hwInfo.getMemoryInfo();
    result.disk = await this.hwInfo.getDiskInfo();

    return result;
  }

  start() {
    this.log.debug('Start client');

    // Set chain watchers
    this.setLatestBlocksFilter();

    // Set isSyncing watcher
    this.web3.eth.isSyncing((error, data) => {
      if (error) {
        this.log.error(this.errorHandler.resolve(error));
      } else {
        this.syncStatus(data);
      }
    });

    this.statsInterval = setInterval(() => {
      this.getStats();
    }, this.STATS_INTERVAL);

    this.usageInterval = setInterval(() => {
      this.usage.getStats();
    }, this.USAGE_INTERVAL);
  }

  stop() {
    this.log.debug('Stop client');

    try {
      this.web3.reset(false);
    } catch (error) {
      this.log.error(this.errorHandler.resolve(error));
    }

    clearInterval(this.statsInterval);
    clearInterval(this.usageInterval);
  }

  setLatestBlocksFilter() {
    try {
      this.web3.eth.filter('latest').watch((error, hash) => {
        if (!error) {
          this.blocksQueue.push(hash);
        }
      });
    } catch (error) {
      this.log.error(this.errorHandler.resolve(error));
    }
  }

  checkLatestBlocksFilter() {
    setInterval(() => {
      if (this.isConnected) {
        let clientLastBlockNumber = (this.lastBlock === null) ? 0 : parseInt(this.lastBlock.number, 10);
        let nodeLastBlockNumber = 0;

        try {
          nodeLastBlockNumber = parseInt(this.web3.eth.blockNumber, 10);
        } catch (error) {
          this.log.error(this.errorHandler.resolve(error));
        }

        if (clientLastBlockNumber > 0 && nodeLastBlockNumber > clientLastBlockNumber) {
          this.log.info(`Client last block ${clientLastBlockNumber} is behind Node last block ${nodeLastBlockNumber}, resetting filters...`);
          this.stop();
          this.start();
        }
      }
    }, this.CHECK_LATEST_FILTER_INTERVAL);
  }

  getStats() {
    this.log.debug('Get stats');

    parallel({
      peers: callback => {
        this.web3.net.getPeerCount((error, data) => {
          if (error) {
            this.log.error(this.errorHandler.resolve(error));
          }

          data = (data === undefined) ? 0 : data;
          return callback(null, data);
        });
      },
      gasPrice: callback => {
        this.web3.eth.getGasPrice((error, data) => {
          if (error) {
            this.log.error(this.errorHandler.resolve(error));
          }

          data = (data === undefined) ? null : data;
          return callback(null, data);
        });
      },
      mining: callback => {
        this.web3.eth.getMining((error, data) => {
          if (error) {
            this.log.error(this.errorHandler.resolve(error));
          }

          data = (data === undefined) ? null : data;
          return callback(null, data);
        });
      },
      hashrate: callback => {
        this.web3.eth.getHashrate((error, data) => {
          if (error) {
            this.log.error(this.errorHandler.resolve(error));
          }

          data = (data === undefined) ? 0 : data;
          return callback(null, data);
        });
      }
    }, (error, stats) => {
      this.server.send('stats', stats);
    });
  }

  getBlock(number, asyncCallback) {
    this.web3.eth.getBlock(number, false, (error, block) => {
      if (error) {
        this.log.error(this.errorHandler.resolve(error));

        if (asyncCallback) {
          asyncCallback();
        }
      } else {
        this.log.debug(`Got block: "${block.number}"`);
        this.processBlock(block);

        if (asyncCallback) {
          asyncCallback();
        }
      }
    });
  }

  getBlockHashes(blockNumber) {
    let result = {
      number: null,
      hash: null,
      parentHash: null
    };

    this.web3.eth.getBlock(blockNumber, false, (error, block) => {
      if (error) {
        this.log.error(this.errorHandler.resolve(error));
      } else {
        if (block === null) {
          this.log.error(`Could not get block "${blockNumber}". Your node might be not fully synced.`, false, true);
        } else {
          result.number = parseInt(block.number, 10);
          result.hash = block.hash.toString();
          result.parentHash = block.parentHash.toString();
        }
      }

      this.server.send('checkChainData', result);
    });
  }

}
