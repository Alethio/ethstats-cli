import Primus from 'primus';
import primusResponder from 'primus-responder';
import Client from './client/index.js';

const PrimusSocket = Primus.createSocket({
  transformer: 'websockets',
  parser: 'JSON',
  plugin: {
    'responder': primusResponder
  }
});

export default class Server {

  constructor(diContainer) {
    this.pkg = diContainer.pkg;
    this.config = diContainer.config;
    this.configServer = diContainer.configServer;
    this.log = diContainer.logger;
    this.cli = diContainer.cli;
    this.lodash = diContainer.lodash;

    this.isTryingToLogin = false;
    this.isLoggedIn = false;
    this.socketIsOpen = false;

    this.url = null;
    this.socket = null;
    this.configToSave = null;

    diContainer.server = this;
    this.client = Client(diContainer);

    return this;
  }

  setHostAndPort() {
    if (this.url === null) {
      let configStoreServer = this.config.configStore.get('server');

      if (!configStoreServer) {
        if (this.config.serverUrls) {
          this.url = this.config.serverUrls[this.config.server.net].url;
          this.configToSave = {
            net: this.config.server.net
          };
        }
      } else {
        if (this.config.serverUrls && configStoreServer.net) {
          this.url = this.config.serverUrls[configStoreServer.net].url;
        }
        if (configStoreServer.url) {
          this.url = configStoreServer.url;
        }
      }

      if (this.config.serverUrls && this.cli.flags.net) {
        if (!this.config.serverUrls[this.cli.flags.net]) {
          this.log.error(`Network does not exists`, false, true);
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

  create(jumpToAskRegistration = false) {
    this.setHostAndPort();

    this.socket = new PrimusSocket(`${this.url}`, {
      reconnect: {
        min: 60000 + (Math.floor(Math.random() * Math.floor(60))), // every 1 minute + random of max 60 seconds
        factor: 1,
        retries: 300 // retries for 25 hours
      }
    });

    this.socket.on('open', () => {
      this.socketIsOpen = true;
      this.log.echo(`Connection established with ethstats server "${this.url}"`);

      if (this.configToSave && !this.lodash.isEqual(this.configToSave, this.config.configStore.get('server'))) {
        this.config.configStore.set('server', this.configToSave);
      }

      if (this.config.configStore.get('firstRun') === false) {
        if (this.config.configStore.get('nodeName') !== undefined && this.config.configStore.get('secretKey') !== undefined) {
          if (this.cli.flags.register) {
            this.log.warning(`Client already registered`);
          }

          this.client.connect();
        } else {
          this.config.configStore.set('firstRun', true);
          this.log.error(`Credentials not found. Config file was reset, please try again.`, false, true);
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

    this.socket.on('error', (error) => {
      this.log.error(`Socket error: ${error.message}`);
    });

    this.socket.on('close', () => {
      this.isLoggedIn = false;
      this.socketIsOpen = false;
      this.log.warning(`Connection closed with ethstats server`);
    });

    this.socket.on('reconnect failed', () => {
      this.log.error(`Reconnect to ethstats server failed! Maximum attempts reached. Please try again later or contact ethstats support.`, false, true);
    });

    this.socket.on('data', (data) => {
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
          this.client.getBlockHashes(data.message);
          break;
        case 'checkChainResponse':
          this.client.resolveCheckChainResponse(data.message);
          break;
        default:
          this.log.info(`Undefined topic: ${data.topic}`);
          break;
      }
    });
  }

  destroy() {
    this.socket.destroy();
  }

  send(topic, msg) {
    let result = false;
    let allowedTopicsWhenNotLoggedIn = [
      {topic: 'login'},
      {topic: 'registerNode'},
      {topic: 'recoverNode'}
    ];
    let isAllowedTopicWhenNotLoggedIn = this.lodash.find(allowedTopicsWhenNotLoggedIn, {'topic': topic}) ? true : false;

    if (this.socket && this.socketIsOpen && (this.isLoggedIn || isAllowedTopicWhenNotLoggedIn)) {
      result = this.socket.write({
        topic: topic,
        msg: msg
      });

      this.log.info(`Sending message on topic: "${topic}"`);

      if (topic === 'block') {
        msg = {
          number: msg.number,
          hash: msg.hash,
          parentHash: msg.parentHash,
        };
      }
      this.log.debug(`Sent "${topic}" message: ${JSON.stringify(msg)}`);
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
        if (this.socket && this.socketIsOpen && (this.isLoggedIn || isAllowedTopicWhenNotLoggedIn)) {
          this.socket.writeAndWait({topic: topic, msg: msg}, (response) => {
            resolve(response);
          });

          this.log.info(`Sending message on topic: "${topic}"`, beginWithNewLine);
          this.log.debug(`Sent "${topic}" message: ${JSON.stringify(msg)}`);
        } else {
          reject('Not connected to the server or not logged in');
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
    this.isLoggedIn = response.isLoggedIn;

    if (this.isLoggedIn) {
      this.log.echo('Successfully logged in');
      this.log.echo(`${this.pkg.description} v${this.pkg.version} started and running...`);
      this.send('connection', {isConnected: true});

      this.configServer.get({
        configName: 'appUrl'
      }).then((value) => {
        if (value) {
          this.log.echo(`Your node is now connected. You can now see your nodes stats/logs at: ${value}`);
        }
      });
    } else {
      this.log.error(`Authentication error: ${response.error}`, false, true);
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