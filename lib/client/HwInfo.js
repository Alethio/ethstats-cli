export default class HwInfo {
  constructor(diContainer) {
    this.log = diContainer.logger;
    this.systemInfo = diContainer.systemInfo;
    this.errorHandler = diContainer.clientErrorHandler;
  }

  getCpuInfo() {
    return this.systemInfo.cpu().then(data => {
      if (data) {
        return JSON.stringify({
          manufacturer: data.manufacturer,
          brand: data.brand,
          speed: data.speed
        });
      }

      return null;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
  }

  getMemoryInfo() {
    return this.systemInfo.memLayout().then(data => {
      if (data && data.length > 0) {
        return JSON.stringify(data.map(mem => {
          return {
            size: mem.size,
            type: mem.type,
            clockSpeed: mem.clockSpeed,
            manufacturer: mem.manufacturer
          };
        }));
      }

      return null;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
  }

  getDiskInfo() {
    return this.systemInfo.diskLayout().then(data => {
      if (data && data.length > 0) {
        return JSON.stringify(data.map(disk => {
          return {
            size: disk.size,
            type: disk.type,
            name: disk.name,
            vendor: disk.vendor
          };
        }));
      }

      return null;
    }).catch(error => {
      this.log.error(this.errorHandler.resolve(error));
      return null;
    });
  }
}
