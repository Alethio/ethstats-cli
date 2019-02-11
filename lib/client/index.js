import Http from './protocol/Http.js';
import WebSocket from './protocol/WebSocket.js';
import Error from './Error.js';

export default diContainer => {
  let client = null;
  let getProtocol = url => {
    return url.split('://')[0];
  };

  let url = diContainer.config.client.url;
  let protocol = getProtocol(url);

  let configStoreClient = diContainer.config.configStore.get('client');
  if (configStoreClient) {
    if (configStoreClient.url) {
      url = configStoreClient.url;
      protocol = getProtocol(url);
    }

    if (configStoreClient.ipcPath) {
      url = configStoreClient.ipcPath;
      protocol = 'ipc';
    }
  }

  if (diContainer.cli.flags.clientUrl) {
    url = diContainer.cli.flags.clientUrl;
    protocol = getProtocol(url);
    diContainer.config.configStore.set('client', {url: url});
  }

  if (diContainer.cli.flags.clientIpcPath) {
    url = diContainer.cli.flags.clientIpcPath;
    protocol = 'ipc';
    diContainer.config.configStore.set('client', {ipcPath: url});
  }

  protocol = (protocol === 'https') ? 'http' : protocol;
  protocol = (protocol === 'wss') ? 'ws' : protocol;

  diContainer.logger.debug(`Init "${protocol}" client protocol`);
  diContainer.clientErrorHandler = new Error(protocol);

  if (protocol === 'http') {
    client = new Http(diContainer);
  } else if (protocol === 'ws' || protocol === 'ipc') {
    client = new WebSocket(diContainer);
  } else {
    diContainer.logger.error(`Unknown protocol: "${protocol}"`, false, true);
  }

  client.protocol = protocol;
  client.url = url;

  return client;
};
