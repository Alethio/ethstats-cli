export default class Usage {

  constructor(diContainer) {
    this.log = diContainer.logger;
    this.systemInfo = diContainer.systemInfo;
    this.errorHandler = diContainer.clientErrorHandler;
    this.server = diContainer.server;

    this.nodeProcessName = null;
  }

  getCpuLoad() {
    let result = null;

    return this.systemInfo.currentLoad().then((data) => {
      if (data) {
        result = data.currentload;
      }
      return result;
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  getMemLoad() {
    let result = {
      memTotal: null,
      memUsed: null
    };

    return this.systemInfo.mem().then((data) => {
      if (data) {
        result.memTotal = data.total;
        result.memUsed = data.used;
      }
      return result;
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  async getNetworkStats() {
    let result = {
      rxSec: null,
      txSec: null
    };
    let iface = await this.systemInfo.networkInterfaceDefault();

    return this.systemInfo.networkStats(iface).then((data) => {
      if (data) {
        result.rxSec = data.rx_sec;
        result.txSec = data.tx_sec;
      }
      return result;
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  getFileSystemStats() {
    let result = {
      rxSec: null,
      wxSec: null
    };

    return this.systemInfo.fsStats().then((data) => {
      if (data) {
        result.rxSec = data.rx_sec;
        result.wxSec = data.wx_sec;
      }
      return result;
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  getDiskIO() {
    let result = {
      rIOSec: null,
      wIOSec: null
    };

    return this.systemInfo.disksIO().then((data) => {
      if (data) {
        result.rIOSec = data.rIO_sec;
        result.wIOSec = data.wIO_sec;
      }
      return result;
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  getProcessLoad(processName) {
    let result = {
      cpu: null,
      mem: null
    };

    return this.systemInfo.processLoad(processName).then((data) => {
      if (data) {
        result.cpu = data.cpu;
        result.mem = data.mem;
      }
      return result;
    }).catch((error) => {
      this.log.error(this.errorHandler.resolve(error));
      return result;
    });
  }

  setNodeProcessName(node) {
    this.nodeProcessName = node.split('/')[0].toLowerCase();
  }

  async getStats() {
    this.log.debug('Get usage');

    let result = {
      cpuLoad: await this.getCpuLoad(),
      memTotal: null,
      memUsed: null,
      netRxSec: null,
      netTxSec: null,
      fsRxSec: null,
      fsWxSec: null,
      diskRIOSec: null,
      diskWIOSec: null,
      nodeCpuLoad: null,
      nodeMemLoad: null,
      clientCpuLoad: null,
      clientMemLoad: null
    };

    let memLoad = await this.getMemLoad();
    result.memTotal = memLoad.memTotal;
    result.memUsed = memLoad.memUsed;

    let networkStats = await this.getNetworkStats();
    result.netRxSec = networkStats.rxSec < 0 ? 0 : networkStats.rxSec;
    result.netTxSec = networkStats.txSec < 0 ? 0 : networkStats.txSec;

    let fsStats = await this.getFileSystemStats();
    result.fsRxSec = fsStats.rxSec < 0 ? 0 : fsStats.rxSec;
    result.fsWxSec = fsStats.wxSec < 0 ? 0 : fsStats.wxSec;

    let diskIO = await this.getDiskIO();
    result.diskRIOSec = diskIO.rIOSec < 0 ? 0 : diskIO.rIOSec;
    result.diskWIOSec = diskIO.wIOSec < 0 ? 0 : diskIO.wIOSec;

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
