import url from 'url';
import Web3 from 'web3-0.x-wrapper';
import parallel from 'async/parallel';
import Abstract from './Abstract.js';
import mapSeries from 'async/mapSeries';

export default class Http extends Abstract {
  constructor(diContainer) {
    super(diContainer);

    this.CHECK_LATEST_FILTER_INTERVAL = 300000;
    this.web3 = new Web3();

    this.checkLatestBlocksFilterInterval = null;
  }

  connect() {
    if (!this.web3.currentProvider) {
      let urlObject = new url.URL(this.url);

      this.log.echo(`Setting Web3 provider to "${urlObject.origin}"`);
      this.web3.setProvider(new this.web3.providers.HttpProvider(urlObject.origin, 0, urlObject.username, urlObject.password));
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

    this.checkLatestBlocksFilter();
  }

  stop(stopConnectionInterval = false) {
    this.log.debug('Stop client');

    try {
      this.web3.reset(false);
    } catch (error) {
      this.log.error(this.errorHandler.resolve(error));
    }

    if (stopConnectionInterval) {
      clearInterval(this.connectionInterval);
    }

    clearInterval(this.statsInterval);
    clearInterval(this.usageInterval);
    clearInterval(this.checkLatestBlocksFilterInterval);
  }

  setLatestBlocksFilter() {
    try {
      this.web3.eth.filter('latest').watch((error, hash) => {
        if (!error) {
          hash = hash.value === undefined ? hash : hash.value;
          this.blocksQueue.push(hash);
        }
      });
    } catch (error) {
      this.log.error(this.errorHandler.resolve(error));
    }
  }

  checkLatestBlocksFilter() {
    this.checkLatestBlocksFilterInterval = setInterval(() => {
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

          data = (data) ? data : 0;
          return callback(null, data);
        });
      },
      gasPrice: callback => {
        this.web3.eth.getGasPrice((error, data) => {
          if (error) {
            this.log.error(this.errorHandler.resolve(error));
          }

          data = (data) ? data.toString() : 0;
          return callback(null, data);
        });
      },
      mining: callback => {
        this.web3.eth.getMining((error, data) => {
          if (error) {
            this.log.error(this.errorHandler.resolve(error));
          }

          data = (data) ? data : false;
          return callback(null, data);
        });
      },
      hashrate: callback => {
        this.web3.eth.getHashrate((error, data) => {
          if (error) {
            this.log.error(this.errorHandler.resolve(error));
          }

          data = (data) ? data : 0;
          return callback(null, data);
        });
      },
      pendingTXs: callback => {
        this.web3.eth.getBlockTransactionCount('pending', (error, data) => {
          if (error) {
            this.log.error(this.errorHandler.resolve(error));
          }

          data = (data) ? data : 0;
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
      blockNumber: null,
      blockHash: null,
      blockParentHash: null
    };

    this.web3.eth.getBlock(blockNumber, false, (error, block) => {
      if (error) {
        this.log.error(this.errorHandler.resolve(error));
      } else if (block === null) {
        this.log.error(`Could not get block "${blockNumber}". Your node might be not fully synced.`, false, true);
      } else {
        result.blockNumber = parseInt(block.number, 10);
        result.blockHash = block.hash.toString();
        result.blockParentHash = block.parentHash.toString();
      }

      this.server.send('checkChainData', result);
    });
  }

  getBlocks(range) {
    mapSeries(range, (blockNumber, callback) => {
      this.log.debug(`History get block: "${blockNumber}"`);
      this.web3.eth.getBlock(blockNumber, false, callback);
    }, (error, results) => {
      if (error) {
        this.log.error(`Error getting block history: ${error}`);
        results = [];
      }

      this.server.send('getBlocksData', results);
    });
  }

  getValidators(block) {
    let result = {
      blockNumber: block.number,
      blockHash: block.hash,
      validators: []
    };

    this.web3._requestManager.sendAsync({method: 'clique_getSignersAtHash', params: [block.hash]}, (error, validators) => {
      if (error) {
        this.log.error(`Could not get validators for block ${block.number}::${block.hash} => ${error.message}`);
      } else {
        result.validators = validators;
        this.server.send('validators', result);
      }
    });
  }
}
