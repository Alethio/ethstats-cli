import os from 'os';
import queue from 'async/queue';
import HwInfo from '../HwInfo.js';
import Usage from '../Usage.js';

export default class Abstract {
  constructor(diContainer) {
    this.CONNECTION_INTERVAL = 5000;
    this.STATS_INTERVAL = 10000;
    this.USAGE_INTERVAL = 5000;

    this.config = diContainer.config;
    this.lodash = diContainer.lodash;
    this.os = os;
    this.pkg = diContainer.pkg;
    this.log = diContainer.logger;
    this.cli = diContainer.cli;
    this.server = diContainer.server;
    this.errorHandler = diContainer.clientErrorHandler;

    this.hwInfo = new HwInfo(diContainer);
    this.usage = new Usage(diContainer);

    this.url = this.config.client.url;

    this.lastSyncStatus = {
      currentBlock: null
    };
    this.lastBlock = null;
    this.isConnected = false;

    this.connectionInterval = null;
    this.statsInterval = null;
    this.usageInterval = null;

    this.blocksQueue = queue((hash, callback) => {
      this.getBlock(hash, callback);
    }, 1);
  }

  processBlock(block) {
    let lastBlockNumber = (this.lastBlock === null) ? null : parseInt(this.lastBlock.number, 10);
    let currentBlockNumber = parseInt(block.number, 10);

    if (lastBlockNumber === null || (currentBlockNumber - lastBlockNumber) === 1) {
      this.lastBlock = block;
      this.server.send('block', block);

      if (this.config.NETWORK_ALGO === 'clique') {
        this.getValidators(block);
      }
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
      if (this.lastBlock.hash === block.hash) {
        this.log.info(`Block "${currentBlockNumber}" has already been sent`);
      } else {
        this.log.info(`Reorg for block "${currentBlockNumber}"`);
        this.server.send('block', block);

        if (this.config.NETWORK_ALGO === 'clique') {
          this.getValidators(block);
        }
      }
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
      syncParams.syncOperation = 'start';
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
    }

    if (this.protocol === 'http') {
      if (syncParams.syncOperation === 'start' || syncParams.syncOperation === 'progress') {
        this.web3.reset(true);
      } else {
        this.setLatestBlocksFilter();
      }
    }

    if (this.lastSyncStatus.currentBlock !== syncParams.currentBlock) {
      this.lastSyncStatus = syncParams;
      this.server.send('sync', syncParams);
      this.lastBlock = null;
    }
  }

  resolveCheckChainResponse(response) {
    if (response.success) {
      this.log.info('The node is on the correct network');
    } else {
      this.log.error(`Server check chain response: ${JSON.stringify(response.errors)}`, false, true);
    }
  }
}
