import os from 'os';
import queue from 'async/queue';

export default class Abstract {

  constructor(diContainer) {
    this.CONNECTION_INTERVAL = 5000;
    this.STATS_INTERVAL = 10000;

    this.config = diContainer.config;
    this.lodash = diContainer.lodash;
    this.os = os;
    this.pkg = diContainer.pkg;
    this.log = diContainer.logger;
    this.cli = diContainer.cli;
    this.server = diContainer.server;
    this.errorHandler = diContainer.clientErrorHandler;

    this.url = this.config.client.url;

    this.lastSyncStatus = {};
    this.lastBlock = null;
    this.isConnected = false;

    this.connectionInterval = null;
    this.blocksQueue = queue((hash, callback) => {
      this.getBlock(hash, callback);
    }, 1);
  }

  processBlock(block) {
    let lastBlockNumber = (this.lastBlock !== null) ? parseInt(this.lastBlock.number, 10) : 0;
    let currentBlockNumber = parseInt(block.number, 10);

    if (lastBlockNumber === 0 || (currentBlockNumber - lastBlockNumber) === 1) {
      this.lastBlock = block;
      this.server.send('block', block);
    }

    if (lastBlockNumber > 0 && (currentBlockNumber - lastBlockNumber) > 1 && (currentBlockNumber - lastBlockNumber) <= 1000) {
      this.log.info(`Missing blocks detected (last block: "${lastBlockNumber}")`);

      let blocksToGet = currentBlockNumber - lastBlockNumber;

      while (blocksToGet > 0) {
        let blockNumber = (currentBlockNumber - blocksToGet) + 1;
        this.blocksQueue.push(blockNumber);
        this.log.info(`Force get block "${blockNumber}"`);
        blocksToGet--;
      }
    }

    if (currentBlockNumber < lastBlockNumber) {
      this.log.info(`Ignoring block "${currentBlockNumber}" because a newer block has already been sent (last block: "${lastBlockNumber}")`);
    }

    if (currentBlockNumber === lastBlockNumber) {
      this.log.info(`Block "${currentBlockNumber}" has already been sent`);
    }
  }

  syncStatus(sync) {
    let syncParams = {
      syncOperation: null,
      startingBlock: 0,
      currentBlock: 0,
      highestBlock: 0,
      progress: 0
    };

    if (sync === true) {
      this.lastBlock = null;
      syncParams.syncOperation = 'start';
      if (this.protocol === 'http') {
        this.web3.reset(true);
      }
    } else if (sync) {
      let startingBlock = (sync.startingBlock) ? sync.startingBlock : ((sync.status) ? sync.status.StartingBlock : 0);
      let currentBlock = (sync.currentBlock) ? sync.currentBlock : ((sync.status) ? sync.status.CurrentBlock : 0);
      let highestBlock = (sync.highestBlock) ? sync.highestBlock : ((sync.status) ? sync.status.HighestBlock : 0);

      let progress = currentBlock - startingBlock;
      let total = highestBlock - startingBlock;

      syncParams.progress = (progress > 0 && total > 0) ? (progress / total * 100).toFixed(2) : 0;
      syncParams.syncOperation = 'progress';
      syncParams.startingBlock = startingBlock;
      syncParams.currentBlock = currentBlock;
      syncParams.highestBlock = highestBlock;
    } else {
      syncParams.syncOperation = 'finish';
      if (this.protocol === 'http') {
        this.setLatestBlocksFilter();
      }
    }

    if (!this.lodash.isEqual(this.lastSyncStatus, syncParams)) {
      this.lastSyncStatus = syncParams;
      this.server.send('sync', syncParams);
    }
  }

  resolveCheckChainResponse(response) {
    if (response.success) {
      this.log.info('The node is on the main ethereum chain');
    } else {
      this.log.error(response.error, false, true);
    }
  }

}
