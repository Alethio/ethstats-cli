import Primus from 'primus';
import primusResponder from 'primus-responder'

const PrimusSocket = Primus.createSocket({
  transformer: 'websockets',
  parser: 'JSON',
  plugin: {
    'responder': primusResponder
  }
});

export default class Socket {
  constructor(appContainer) {
    this.pkg = appContainer.pkg;
    this.config = appContainer.config;
    this.log = appContainer.logger;
    this.cli = appContainer.cli;

    this.isTryingToLogin = false;
    this.isLoggedIn = false;
    this.socketIsOpen = false;

    this.host = this.config.socketServer.host;
    this.port = this.config.socketServer.port;

    let configStoreSocketServer = this.config.configStore.get('socketServer');
    if (configStoreSocketServer !== undefined) {
      this.host = configStoreSocketServer.host;
      this.port = configStoreSocketServer.port;
    }

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
    });

    this.client.on('error', (error) => {
      this.log.error(`Socket error: ${error.message}`);
    });

    this.client.on('close', () => {
      this.isLoggedIn = false;
      this.socketIsOpen = false;
      this.log.warning(`Connection with ethstats server has closed`);
    });

    this.client.on('reconnect failed', () => {
      this.log.error(`Reconnect to ethstats server failed! Maximum attempts reached. Please try again later or contact ethstats support.`, false, true);
    });

    return this;
  }

  send(topic, msg) {
    let result = false;

    if (this.client && this.socketIsOpen && (this.isLoggedIn || topic === 'login' || topic === 'registerNode' || topic === 'recoverNode')) {
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
    return new Promise((resolve, reject) => {
      try {
        if (this.client && this.socketIsOpen && (this.isLoggedIn || topic === 'checkIfNodeExists' || topic === 'checkIfEmailExists' || topic === 'sendRecoveryEmail' || topic === 'checkIfNodeRecoveryHashExists')) {
          this.client.writeAndWait({topic: topic, msg: msg}, (response) => {
            resolve(response);
          });

          let beginWithNewLine = (topic === 'checkIfNodeExists' || topic === 'checkIfEmailExists' || topic === 'checkIfNodeRecoveryHashExists') ? true : false;

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
