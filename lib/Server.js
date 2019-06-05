import Primus from 'primus';
import primusResponder from 'primus-responder';
import EventEmitter from 'events';
import client from './client/index.js';

const PrimusSocket = Primus.createSocket({
  transformer: 'websockets',
  pathname: '/api',
  parser: 'JSON',
  plugin: {
    responder: primusResponder
  }
});

export default class Server {
  constructor(diContainer) {
    this.pkg = diContainer.pkg;
    this.config = diContainer.config;
    this.configurator = diContainer.configurator;
    this.log = diContainer.logger;
    this.cli = diContainer.cli;
    this.lodash = diContainer.lodash;

    this.eventEmitter = new EventEmitter();

    this.isTryingToLogin = false;
    this.isLoggedIn = false;
    this.socketIsOpen = false;

    this.url = null;
    this.socket = null;
    this.configToSave = null;

    diContainer.server = this;
    this.client = client(diContainer);

    this.lastCheckedBlockNumber = null;
    this.lastCheckedSyncBlockNumber = null;

    this.CHECK_LAST_BLOCK_INTERVAL = 300; // 5 min
    this.checkLastBlockInterval = setInterval(() => {
      let lastReceivedBlockNumber = (this.client.lastBlock) ? this.client.lastBlock.number : null;
      let lastReceivedSyncBlockNumber = (this.client.lastSyncStatus) ? this.client.lastSyncStatus.currentBlock : null;

      this.log.debug(`Check if receiving new blocks => last checked block: ${this.lastCheckedBlockNumber}, last received block: ${lastReceivedBlockNumber}`);
      this.log.debug(`Check if receiving new sync blocks => last checked sync block: ${this.lastCheckedSyncBlockNumber}, last received block: ${lastReceivedSyncBlockNumber}`);

      if (this.lastCheckedBlockNumber === lastReceivedBlockNumber && this.lastCheckedSyncBlockNumber === lastReceivedSyncBlockNumber) {
        this.log.info(`No new blocks received for more than ${this.CHECK_LAST_BLOCK_INTERVAL} seconds.`);
        this.eventEmitter.emit('destroy');
      } else {
        this.lastCheckedBlockNumber = lastReceivedBlockNumber;
        this.lastCheckedSyncBlockNumber = lastReceivedSyncBlockNumber;
      }
    }, this.CHECK_LAST_BLOCK_INTERVAL * 1000);

    return this;
  }

  setHostAndPort() {
    if (this.url === null) {
      let configStoreServer = this.config.configStore.get('server');

      if (configStoreServer) {
        if (this.config.serverUrls && configStoreServer.net) {
          this.url = this.config.serverUrls[configStoreServer.net].url;
        }

        if (configStoreServer.url) {
          this.url = configStoreServer.url;
        }
      } else if (this.config.serverUrls) {
        this.url = this.config.serverUrls[this.config.server.net].url;
        this.configToSave = {
          net: this.config.server.net
        };
      }

      if (this.config.serverUrls && this.cli.flags.net) {
        if (!this.config.serverUrls[this.cli.flags.net]) {
          this.log.error('Network does not exist', false, true);
        }

        this.url = this.config.serverUrls[this.cli.flags.net].url;
        this.configToSave = {
          net: this.cli.flags.net
        };
      }

      if (this.cli.flags.serverUrl) {
        this.url = this.cli.flags.serverUrl;
        this.configToSave = {
          url: this.url
        };
      }
    }
  }

  create() {
    this.setHostAndPort();

    this.socket = new PrimusSocket(`${this.url}`, {
      reconnect: {
        min: (1 + (Math.floor(Math.random() * 10))) * 1000, // Random between 1 and 10 seconds
        factor: 1,
        retries: 8640
      }
    });

    this.socket.on('open', () => {
      this.socketIsOpen = true;
      this.log.echo(`Connection established with ethstats server "${this.url}"`);

      if (this.isLoggedIn) {
        this.isLoggedIn = false;
      }

      if (this.configToSave && !this.lodash.isEqual(this.configToSave, this.config.configStore.get('server'))) {
        this.config.configStore.set('server', this.configToSave);
      }

      if (this.config.configStore.get('firstRun') === false) {
        if (this.config.configStore.get('nodeName') !== undefined && this.config.configStore.get('secretKey') !== undefined) {
          if (this.cli.flags.register) {
            this.log.warning('Client already registered');
          }

          this.client.connect();
        } else {
          this.config.configStore.set('firstRun', true);
          this.log.error('Credentials not found. Config file was reset, please try again.', false, true);
        }
      } else {
        let intervalId = setInterval(() => {
          if (this.config.configStore.get('firstRun') === false && this.config.configStore.get('nodeName') !== undefined && this.config.configStore.get('secretKey') !== undefined) {
            this.client.connect();
            clearInterval(intervalId);
          }
        }, 1000);
      }
    });

    this.socket.on('error', error => {
      this.log.error(`Socket error: ${error.message}`);
    });

    this.socket.on('close', () => {
      this.isLoggedIn = false;
      this.socketIsOpen = false;
      this.log.warning('Connection closed with ethstats server');
    });

    this.socket.on('end', () => {
      this.isLoggedIn = false;
      this.socketIsOpen = false;
      this.log.error('Connection ended with ethstats server', false, true);
    });

    this.socket.on('reconnect failed', () => {
      this.log.error('Reconnect to ethstats server failed! Maximum attempts reached. Please try again later or contact ethstats support.', false, true);
    });

    this.socket.on('data', message => {
      this.log.debug(`Data received for topic: "${message.topic}"`);

      switch (message.topic) {
        case 'invalidMessage':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'clientTimeout':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'requestRateLimitReached':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'registerNodeResponse':
          this.resolveRegisterNodeResponse(message.payload);
          break;
        case 'loginResponse':
          this.resolveLoginResponse(message.payload);
          break;
        case 'logoutResponse':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'connectionResponse':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'syncResponse':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'statsResponse':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'usageResponse':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'blockResponse':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'ping':
          this.send('pong', message.payload);
          break;
        case 'pongResponse':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'checkChain':
          this.client.getBlockHashes(message.payload.blockNumber);
          break;
        case 'checkChainResponse':
          this.client.resolveCheckChainResponse(message.payload);
          break;
        case 'getBlocks':
          this.client.getBlocks(message.payload);
          break;
        case 'getBlocksResponse':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'validatorsResponse':
          this.resolveResponse(message.topic, message.payload);
          break;
        case 'getConfigResponse':
          this.resolveGetConfigResponse(message.payload);
          break;
        default:
          this.log.info(`Undefined topic: ${message.topic}`);
          break;
      }
    });
  }

  destroy() {
    if (this.socket) {
      this.socket.destroy();
    }

    clearInterval(this.checkLastBlockInterval);
  }

  send(topic, payload) {
    let result = false;
    let allowedTopicsWhenNotLoggedIn = [
      {topic: 'login'},
      {topic: 'registerNode'},
      {topic: 'recoverNode'}
    ];
    let isAllowedTopicWhenNotLoggedIn = Boolean(this.lodash.find(allowedTopicsWhenNotLoggedIn, {topic: topic}));

    if (this.socket && this.socketIsOpen && (this.isLoggedIn || isAllowedTopicWhenNotLoggedIn)) {
      result = this.socket.write({
        topic: topic,
        payload: payload
      });

      this.log.info(`Sending message on topic: "${topic}"`);

      if (topic === 'block') {
        payload = {
          number: payload.number,
          hash: payload.hash,
          parentHash: payload.parentHash
        };
      }

      if (topic === 'getBlocksData') {
        let tmpPayload = [];
        for (let i = 0; i < payload.length; i++) {
          tmpPayload.push({number: payload[i].number});
        }

        payload = tmpPayload;
      }

      this.log.debug(`Sent message on "${topic}" with payload: ${JSON.stringify(payload)}`);
    }

    return result;
  }

  sendAndWait(topic, payload) {
    let allowedTopicsWhenNotLoggedIn = [
      {topic: 'checkIfNodeExists'},
      {topic: 'checkIfEmailExists'},
      {topic: 'sendRecoveryEmail'},
      {topic: 'checkIfNodeRecoveryHashExists'}
    ];
    let isAllowedTopicWhenNotLoggedIn = Boolean(this.lodash.find(allowedTopicsWhenNotLoggedIn, {topic: topic}));

    let topicsWhereLogInfosShouldBeginWithNewLine = [
      {topic: 'checkIfNodeExists'},
      {topic: 'checkIfEmailExists'},
      {topic: 'checkIfNodeRecoveryHashExists'}
    ];
    let beginWithNewLine = Boolean(this.lodash.find(topicsWhereLogInfosShouldBeginWithNewLine, {topic: topic}));

    return new Promise((resolve, reject) => {
      try {
        if (this.socket && this.socketIsOpen && (this.isLoggedIn || isAllowedTopicWhenNotLoggedIn)) {
          this.socket.writeAndWait({topic: topic, payload: payload}, response => {
            resolve(response);
          });

          this.log.info(`Sending message on topic: "${topic}"`, beginWithNewLine);
          this.log.debug(`Sent message on "${topic}" with payload: ${JSON.stringify(payload)}`);
        } else {
          reject(new Error('Not connected to the server or not logged in'));
        }
      } catch (e) {
        reject(e);
      }
    });
  }

  login(params) {
    let result = false;

    if (!this.isLoggedIn && !this.isTryingToLogin && this.socketIsOpen) {
      this.isTryingToLogin = true;
      this.log.echo(`Trying to login as "${this.config.configStore.get('nodeName')}"...`);
      result = this.send('login', params);
    }

    return result;
  }

  logout() {
    let result = false;

    if (this.isLoggedIn) {
      this.send('connection', {isConnected: false});
      result = this.send('logout', {});
      this.isLoggedIn = false;
    }

    return result;
  }

  resolveLoginResponse(response) {
    this.isLoggedIn = response.success;

    if (this.isLoggedIn) {
      this.log.echo('Successfully logged in');
      this.log.echo(`${this.pkg.description} v${this.pkg.version} started and running...`);
      this.send('connection', {isConnected: true});
      this.send('getConfig', {configName: 'NETWORK_ALGO'});

      let configStoreServer = this.config.configStore.get('server');
      if (configStoreServer && configStoreServer.net !== undefined) {
        this.configurator.get({
          configName: 'dashboardUrl',
          configParams: {
            networkName: configStoreServer.net
          }
        }).then(value => {
          if (value) {
            this.log.echo(`Your node is now connected. You can now see your nodes stats/logs at: ${value.url}`);
          }
        });
      }
    } else {
      let errorMessage = `Authentication error: ${JSON.stringify(response.errors)}.`;
      let possibleFlagErrorType = '';

      if (this.cli.flags.net) {
        possibleFlagErrorType = 'network';
      }

      if (this.cli.flags.serverUrl) {
        possibleFlagErrorType = 'server';
      }

      if (possibleFlagErrorType !== '') {
        errorMessage += ` You are trying to switch the ${possibleFlagErrorType}! Make sure the node is registered for the that ${possibleFlagErrorType}!`;
      }

      this.log.error(errorMessage, false, true);
    }

    this.isTryingToLogin = false;
  }

  registerNode(accountEmail, nodeName) {
    return this.send('registerNode', {
      accountEmail: accountEmail,
      nodeName: nodeName
    });
  }

  resolveRegisterNodeResponse(response) {
    let responseData = response.data[0];
    let getUniqueHash = () => {
      let result = '';
      let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

      for (let i = 0; i < 5; i++) {
        result += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      return result;
    };

    if (response.success === false) {
      let nodeAlreadyRegistered = false;

      response.errors.forEach(error => {
        if (error === 'Node already registered') {
          nodeAlreadyRegistered = true;
        }

        if (!nodeAlreadyRegistered || (nodeAlreadyRegistered && !this.cli.flags.register)) {
          this.log.error(error, false, true);
        } else {
          this.log.warning(error);
        }
      });

      if (this.cli.flags.register && nodeAlreadyRegistered) {
        let newNodeName = `${responseData.nodeName}-${getUniqueHash()}`;
        this.log.echo(`Trying to register with suffix: ${newNodeName}`);
        this.registerNode(responseData.accountEmail, newNodeName);
      }
    } else {
      this.log.echo(`Registered successfully node name: ${responseData.nodeName}`);
      this.config.configStore.set('nodeName', responseData.nodeName);
      this.config.configStore.set('secretKey', responseData.secretKey);
      this.config.configStore.set('firstRun', false);
    }
  }

  resolveResponse(topic, response) {
    if (response.errors && response.errors.length) {
      this.log.error(`Server response on topic: "${topic}" errors: ${JSON.stringify(response.errors)}`);
    } else if (response.warnings && response.warnings.length) {
      this.log.warning(`Server response on topic: "${topic}" warnings: ${JSON.stringify(response.warnings)}`);
    }
  }

  resolveGetConfigResponse(response) {
    this.resolveResponse('getConfig', response);
    if (response.success) {
      this.lodash.merge(this.config, response.data.shift());
    }
  }
}
