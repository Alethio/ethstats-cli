import Web3 from 'web3';
import Web3ErrorHandler from './Web3ErrorHandler.js';

export default class Web3Bridge {

  constructor(diContainer) {
    this.web3 = new Web3();
    this.log = diContainer.logger;
    this.web3ErrorHandler = new Web3ErrorHandler();
  }

  setProvider(host, port) {
    try {
      if (!this.web3.currentProvider) {
        this.log.echo(`Setting Web3 provider to "${host}:${port}"`);
        this.web3.setProvider(new this.web3.providers.HttpProvider(port ? `${host}:${port}` : host));
      }
    } catch (error) {
      this.log.error(`Could not set Web3 provider to "${host}:${port}" => ${error.message}`);
    }
  }

  isConnected() {
    return this.web3.isConnected();
  }

  reset(keepIsSyncing) {
    let result = null;

    try {
      result = this.web3.reset(keepIsSyncing);
    } catch (error) {
      this.log.error(this.web3ErrorHandler.resolve(error));
    }

    return result;
  }

  filter(filterString) {
    let result = null;

    try {
      result = this.web3.eth.filter(filterString);
    } catch (error) {
      this.log.error(this.web3ErrorHandler.resolve(error));
    }

    return result;
  }

  getCoinbase() {
    let result = null;

    try {
      result = this.web3.eth.coinbase;
    } catch (error) {
      this.log.error(this.web3ErrorHandler.resolve(error));
    }

    return result;
  }

  getNodeVersion() {
    let result = null;

    try {
      result = this.web3.version.node;
    } catch (error) {
      this.log.error(this.web3ErrorHandler.resolve(error));
    }

    return result;
  }

  getNetworkVersion() {
    let result = null;

    try {
      result = this.web3.version.network;
    } catch (error) {
      this.log.error(this.web3ErrorHandler.resolve(error));
    }

    return result;
  }

  getEthereumVersion() {
    let result = null;

    try {
      result = this.web3.version.ethereum;
    } catch (error) {
      this.log.error(this.web3ErrorHandler.resolve(error));
    }

    return result;
  }

  getApiVersion() {
    let result = null;

    try {
      result = this.web3.version.api;
    } catch (error) {
      this.log.error(this.web3ErrorHandler.resolve(error));
    }

    return result;
  }

  getLastBlockNumber() {
    let result = null;

    try {
      result = this.web3.eth.blockNumber;
    } catch (error) {
      this.log.error(this.web3ErrorHandler.resolve(error));
    }

    return result;
  }

  getBlock(blockHashOrBlockNumber, returnTransactionObjects = false, callback = undefined) {
    if (!callback) {
      let data;

      try {
        data = this.web3.eth.getBlock(blockHashOrBlockNumber, returnTransactionObjects);
      } catch (error) {
        this.log.error(this.web3ErrorHandler.resolve(error));
      }

      return (data === undefined) ? null : data;
    } else {
      this.web3.eth.getBlock(blockHashOrBlockNumber, returnTransactionObjects, (error, data) => {
        if (error) {
          this.log.error(this.web3ErrorHandler.resolve(error));
        }

        data = (data === undefined) ? null : data;
        return callback(error, data);
      });
    }
  }

  isSyncing(callback) {
    this.web3.eth.isSyncing((error, data) => {
      if (error) {
        this.log.error(this.web3ErrorHandler.resolve(error));
      }

      data = (data === undefined) ? null : data;
      return callback(error, data);
    });
  }

  getPeerCount(callback) {
    this.web3.net.getPeerCount((error, data) => {
      if (error) {
        this.log.error(this.web3ErrorHandler.resolve(error));
      }

      data = (data === undefined) ? 0 : data;
      return callback(null, data);
    });
  }

  getGasPrice(callback) {
    this.web3.eth.getGasPrice((error, data) => {
      if (error) {
        this.log.error(this.web3ErrorHandler.resolve(error));
      }

      data = (data === undefined) ? null : data;
      return callback(null, data);
    });
  }

  getMining(callback) {
    this.web3.eth.getMining((error, data) => {
      if (error) {
        this.log.error(this.web3ErrorHandler.resolve(error));
      }

      data = (data === undefined) ? null : data;
      return callback(null, data);
    });
  }

  getHashrate(callback) {
    this.web3.eth.getHashrate((error, data) => {
      if (error) {
        this.log.error(this.web3ErrorHandler.resolve(error));
      }

      data = (data === undefined) ? 0 : data;
      return callback(null, data);
    });
  }

}