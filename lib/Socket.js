import Primus from 'primus';
import primusResponder from 'primus-responder';
import Rpc from './Rpc.js';
import Register from './Register.js';

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

    this.host = this.config.socketServer.host;
    this.port = this.config.socketServer.port;

    this.client = null;

    diContainer.socket = this;

    this.rpc = new Rpc(diContainer);
    this.register = new Register(diContainer);


    let configStoreSocketServer = this.config.configStore.get('socketServer');
    if (configStoreSocketServer !== undefined) {
      this.host = configStoreSocketServer.host;
      this.port = configStoreSocketServer.port;
    }

    if (this.cli.flags.net && !this.cli.flags.serverHost && !this.cli.flags.serverPort) {
      this.host = this.config.socketServer.host;
      this.port = this.config.socketServer.port;
      this.connectToServer(false);

      this.client.on('open', () => {
        this.sendAndWait('getConfig', {
          configName: 'serverConnection',
          configParams: {networkName: this.cli.flags.net}
        }).then((response) => {
          if (response.success) {
            let serverConfig = response.data[0];
            if (this.host != serverConfig.host || this.port != serverConfig.port) {
              this.host = serverConfig.host;
              this.port = serverConfig.port;

              this.log.echo(`Switching ethstats server...`);
              this.destroy();
              this.connectToServer(true);
            } else {
              this.startCommunication();
            }

            return this;
          } else {
            this.log.error(response.errors[0], false, true);
          }
        });
      });
    } else {
      if (this.cli.flags.serverHost || this.cli.flags.serverPort) {
        this.host = (!this.cli.flags.serverHost) ? this.host : this.cli.flags.serverHost;
        this.port = (!this.cli.flags.serverPort) ? this.port : this.cli.flags.serverPort;
      }

      this.connectToServer(true);
      return this;
    }
  }

  connectToServer(startCommunication = true, jumpToAskRegistration = false) {
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

      let configStoreSocketServer = this.config.configStore.get('socketServer');
      if (configStoreSocketServer === undefined || this.host != configStoreSocketServer.host || this.port != configStoreSocketServer.port) {
        this.config.configStore.set('socketServer', {
          host: this.host,
          port: this.port
        });
      }

      if (startCommunication) {
        this.startCommunication(jumpToAskRegistration);
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
          this.register.resolveRegisterNodeResponse(data.message);
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

  startCommunication(jumpToAskRegistration = false) {
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
      if (!this.cli.flags.register) {
        if (jumpToAskRegistration) {
          this.register.askRegistration();
        } else {
          this.log.echo(`First run detected. Please follow instructions to register your node.`);
          this.register.askInstallationType();
        }
      } else {
        this.register.registerNode(this.cli.flags.accountEmail, this.cli.flags.nodeName);
      }

      let intervalId = setInterval(() => {
        if (this.config.configStore.get('firstRun') === false && this.config.configStore.get('nodeName') !== undefined && this.config.configStore.get('secretKey') !== undefined) {
          this.rpc.connect();
          clearInterval(intervalId);
        }
      }, 1000);
    }
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
      {topic: 'checkIfNodeRecoveryHashExists'},
      {topic: 'getConfig'}
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

}
