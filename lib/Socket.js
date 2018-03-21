import Primus from 'primus';
import primusResponder from 'primus-responder';
import Rpc from './Rpc.js';

const PrimusSocket = Primus.createSocket({
  transformer: 'websockets',
  parser: 'JSON',
  plugin: {
    'responder': primusResponder
  }
});

export default class Socket {
  constructor(diContainer) {
    this.pkg = diContainer.pkg;
    this.config = diContainer.config;
    this.log = diContainer.logger;
    this.cli = diContainer.cli;
    this.lodash = diContainer.lodash;

    this.isTryingToLogin = false;
    this.isLoggedIn = false;
    this.socketIsOpen = false;

    this.host = null;
    this.port = null;

    this.client = null;
    this.socketServerConfigToSave = null;

    diContainer.socket = this;
    this.rpc = new Rpc(diContainer);

    return this;
  }

  setHostAndPort() {
    if (this.host === null && this.port === null) {
      let configStoreSocketServer = this.config.configStore.get('socketServer');
      if (!configStoreSocketServer) {
        if (this.config.socketServerConnection) {
          this.host = this.config.socketServerConnection[this.config.defaultNet].host;
          this.port = this.config.socketServerConnection[this.config.defaultNet].port;
          this.socketServerConfigToSave = {
            net: this.config.defaultNet
          };
        }
      } else {
        if (this.config.socketServerConnection && configStoreSocketServer.net) {
          this.host = this.config.socketServerConnection[configStoreSocketServer.net].host;
          this.port = this.config.socketServerConnection[configStoreSocketServer.net].port;
        }
        if (configStoreSocketServer.host && configStoreSocketServer.port) {
          this.host = configStoreSocketServer.host;
          this.port = configStoreSocketServer.port;
        }
      }

      if (this.config.socketServerConnection && this.cli.flags.net) {
        if (!this.config.socketServerConnection[this.cli.flags.net]) {
          this.log.error(`Network does not exists`, false, true);
        }

        this.host = this.config.socketServerConnection[this.cli.flags.net].host;
        this.port = this.config.socketServerConnection[this.cli.flags.net].port;
        this.socketServerConfigToSave = {
          net: this.cli.flags.net
        };
      }

      this.host = this.cli.flags.serverHost ? this.cli.flags.serverHost : this.host;
      this.port = this.cli.flags.serverPort ? this.cli.flags.serverPort : this.port;

      if (this.cli.flags.serverHost || this.cli.flags.serverPort) {
        this.socketServerConfigToSave = {
          host: this.host,
          port: this.port
        };
      }
    }
  }

  create(jumpToAskRegistration = false) {
    this.setHostAndPort();

    this.client = new PrimusSocket(`${this.host}:${this.port}`, {
      reconnect: {
        min: 60000 + (Math.floor(Math.random() * Math.floor(60))), // every 1 minute + random of max 60 seconds
        factor: 1,
        retries: 300 // retries for 25 hours
      }
    });

    this.client.on('open', () => {
      this.socketIsOpen = true;
      this.log.echo(`Connection established with ethstats server "${this.host}:${this.port}"`);

      if (this.socketServerConfigToSave && !this.lodash.isEqual(this.socketServerConfigToSave, this.config.configStore.get('socketServer'))) {
        this.config.configStore.set('socketServer', this.socketServerConfigToSave);
      }

      if (this.config.configStore.get('firstRun') === false) {
        if (this.config.configStore.get('nodeName') !== undefined && this.config.configStore.get('secretKey') !== undefined) {
          if (this.cli.flags.register) {
            this.log.warning(`Client already registered`);
          }

          this.rpc.connect();
        } else {
          this.config.configStore.set('firstRun', true);
          this.log.error(`Credentials not found. Config file was reset, please try again.`, false, true);
        }
      } else {
        let intervalId = setInterval(() => {
          if (this.config.configStore.get('firstRun') === false && this.config.configStore.get('nodeName') !== undefined && this.config.configStore.get('secretKey') !== undefined) {
            this.rpc.connect();
            clearInterval(intervalId);
          }
        }, 1000);
      }
    });

    this.client.on('error', (error) => {
      this.log.error(`Socket error: ${error.message}`);
    });

    this.client.on('close', () => {
      this.isLoggedIn = false;
      this.socketIsOpen = false;
      this.log.warning(`Connection closed with ethstats server`);
    });

    this.client.on('reconnect failed', () => {
      this.log.error(`Reconnect to ethstats server failed! Maximum attempts reached. Please try again later or contact ethstats support.`, false, true);
    });

    this.client.on('data', (data) => {
      this.log.info(`Data received for topic: "${data.topic}"`);

      switch (data.topic) {
        case 'registerNodeResponse':
          this.resolveRegisterNodeResponse(data.message);
          break;
        case 'loginResponse':
          this.resolveLoginResponse(data.message);
          break;
        case 'validationError':
          this.log.error(`Validation error: ${JSON.stringify(data.message.errors, null, 4)}`);
          break;
        case 'getBlockHashes':
          this.rpc.getBlockHashes(data.message);
          break;
        case 'checkChainResponse':
          this.rpc.resolveCheckChainResponse(data.message);
          break;
        default:
          this.log.info(`Undefined topic: ${data.topic}`);
          break;
      }
    });
  }

  destroy() {
    this.client.destroy();
  }

  send(topic, msg) {
    let result = false;
    let allowedTopicsWhenNotLoggedIn = [
      {topic: 'login'},
      {topic: 'registerNode'},
      {topic: 'recoverNode'}
    ];
    let isAllowedTopicWhenNotLoggedIn = this.lodash.find(allowedTopicsWhenNotLoggedIn, {'topic': topic}) ? true : false;

    if (this.client && this.socketIsOpen && (this.isLoggedIn || isAllowedTopicWhenNotLoggedIn)) {
      result = this.client.write({
        topic: topic,
        msg: msg
      });

      this.log.info(`Sending message on topic: "${topic}"`);
      this.log.debug(`"${topic}" message: ${JSON.stringify(msg, null, 4)}`);
    }

    return result;
  }

  sendAndWait(topic, msg) {
    let allowedTopicsWhenNotLoggedIn = [
      {topic: 'checkIfNodeExists'},
      {topic: 'checkIfEmailExists'},
      {topic: 'sendRecoveryEmail'},
      {topic: 'checkIfNodeRecoveryHashExists'}
    ];
    let isAllowedTopicWhenNotLoggedIn = this.lodash.find(allowedTopicsWhenNotLoggedIn, {'topic': topic}) ? true : false;

    let topicsWhereLogInfosShouldBeginWithNewLine = [
      {topic: 'checkIfNodeExists'},
      {topic: 'checkIfEmailExists'},
      {topic: 'checkIfNodeRecoveryHashExists'}
    ];
    let beginWithNewLine = this.lodash.find(topicsWhereLogInfosShouldBeginWithNewLine, {'topic': topic}) ? true : false;

    return new Promise((resolve, reject) => {
      try {
        if (this.client && this.socketIsOpen && (this.isLoggedIn || isAllowedTopicWhenNotLoggedIn)) {
          this.client.writeAndWait({topic: topic, msg: msg}, (response) => {
            resolve(response);
          });

          this.log.info(`Sending message on topic: "${topic}"`, beginWithNewLine);
          this.log.debug(`"${topic}" message: ${JSON.stringify(msg, null, 4)}`);
        } else {
          reject('Not connected to the server or not logged in');
        }
      } catch (e) {
        reject(e);
      }
    });

  }

  login(params) {
    if (!this.isTryingToLogin) {
      this.isTryingToLogin = true;
      let intervalId = setInterval(() => {
        if (this.socketIsOpen) {
          clearInterval(intervalId);
          return this.send('login', params);
        }
      }, 1000);
    }
  }

  logout() {
    let result = false;
    if (this.isLoggedIn) {
      result = this.send('logout', {});
      this.isLoggedIn = false;
    }

    return result;
  }

  resolveLoginResponse(response) {
    if (response.isLoggedIn) {
      this.log.echo(`Successfully logged in as "${this.config.configStore.get('nodeName')}"`);
      this.log.echo(`${this.pkg.description} v${this.pkg.version} started and running...`);
    } else {
      this.log.error(`Authentication error: ${response.error}`, false, true);
    }

    this.isTryingToLogin = false;
    this.isLoggedIn = response.isLoggedIn;
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
      let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (let i = 0; i < 5; i++) {
        result += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      return result;
    };

    if (response.success === false) {
      let nodeAlreadyRegistered = false;

      response.errors.forEach((error) => {
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

}
