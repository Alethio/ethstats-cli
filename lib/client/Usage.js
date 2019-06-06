export default class Usage {
  constructor(diContainer) {
    this.log = diContainer.logger;
    this.systemInfo = diContainer.systemInfo;
    this.errorHandler = diContainer.clientErrorHandler;
    this.server = diContainer.server;

    this.nodeProcessName = null;
  }

  getCpuLoad() {
    let result = 0;

    return this.systemInfo.currentLoad().then(data => {
      if (data) {
        result = data.currentload;
      }

      return result;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  getMemLoad() {
    let result = {
      memTotal: 0,
      memUsed: 0
    };

    return this.systemInfo.mem().then(data => {
      if (data) {
        result.memTotal = data.total;
        result.memUsed = data.used;
      }

      return result;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  async getNetworkStats() {
    let result = {
      rxSec: 0,
      txSec: 0
    };
    let iface = await this.systemInfo.networkInterfaceDefault();

    return this.systemInfo.networkStats(iface).then(data => {
      if (data) {
        result.rxSec = data[0].rx_sec;
        result.txSec = data[0].tx_sec;
      }

      return result;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  getFileSystemStats() {
    let result = {
      rxSec: 0,
      wxSec: 0
    };

    return this.systemInfo.fsStats().then(data => {
      if (data) {
        result.rxSec = data.rx_sec;
        result.wxSec = data.wx_sec;
      }

      return result;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  getDiskIO() {
    let result = {
      rIOSec: 0,
      wIOSec: 0
    };

    return this.systemInfo.disksIO().then(data => {
      if (data) {
        result.rIOSec = data.rIO_sec;
        result.wIOSec = data.wIO_sec;
      }

      return result;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  getProcessLoad(processName) {
    let result = {
      cpu: 0,
      mem: 0
    };

    return this.systemInfo.processLoad(processName).then(data => {
      if (data) {
        result.cpu = data.cpu;
        result.mem = data.mem;
      }

      return result;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  setNodeProcessName(node) {
    if (node) {
      this.nodeProcessName = node.split('/')[0].toLowerCase();
    }
  }

  async getStats() {
    this.log.debug('Get usage');

    let result = {
      hostCpuLoad: await this.getCpuLoad(),
      hostMemTotal: 0,
      hostMemUsed: 0,
      hostNetRxSec: 0,
      hostNetTxSec: 0,
      hostFsRxSec: 0,
      hostFsWxSec: 0,
      hostDiskRIOSec: 0,
      hostDiskWIOSec: 0,
      nodeCpuLoad: 0,
      nodeMemLoad: 0,
      clientCpuLoad: 0,
      clientMemLoad: 0
    };

    let memLoad = await this.getMemLoad();
    result.hostMemTotal = memLoad.memTotal;
    result.hostMemUsed = memLoad.memUsed;

    let networkStats = await this.getNetworkStats();
    result.hostNetRxSec = networkStats.rxSec < 0 ? 0 : networkStats.rxSec;
    result.hostNetTxSec = networkStats.txSec < 0 ? 0 : networkStats.txSec;

    let fsStats = await this.getFileSystemStats();
    result.hostFsRxSec = fsStats.rxSec < 0 ? 0 : fsStats.rxSec;
    result.hostFsWxSec = fsStats.wxSec < 0 ? 0 : fsStats.wxSec;

    let diskIO = await this.getDiskIO();
    result.hostDiskRIOSec = diskIO.rIOSec < 0 ? 0 : diskIO.rIOSec;
    result.hostDiskWIOSec = diskIO.wIOSec < 0 ? 0 : diskIO.wIOSec;

    if (this.nodeProcessName) {
      let nodeLoad = await this.getProcessLoad(this.nodeProcessName);
      result.nodeCpuLoad = nodeLoad.cpu;
      result.nodeMemLoad = nodeLoad.mem;
    }

    let clientLoad = await this.getProcessLoad('ethstats-cli');
    result.clientCpuLoad = clientLoad.cpu;
    result.clientMemLoad = clientLoad.mem;

    this.server.send('usage', result);

    return result;
  }
}
