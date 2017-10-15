import Primus from 'primus';

const PrimusSocket = Primus.createSocket({
  transformer: 'websockets',
  parser: 'JSON'
});

export default class Socket {
  constructor(appContainer) {
    this.inquirer = appContainer.inquirer;
    this.config = appContainer.config;
    this.log = appContainer.logger;
    this.cli = appContainer.cli;

    this.isLoggedIn = false;
    this.socketIsOpen = false;

    this.host = this.config.socketServer.host;
    this.port = this.config.socketServer.port;

    let configStoreSocketServer = this.config.configStore.get('socketServer');
    if (configStoreSocketServer !== undefined) {
      this.host = configStoreSocketServer.host;
      this.port = configStoreSocketServer.port;
    }

    this.client = new PrimusSocket(`${this.host}:${this.port}`);
    this.client.on('open', () => {
      this.socketIsOpen = true;
      this.log.info(`WS connection established with the server "${this.host}:${this.port}"`);
    });

    this.client.on('error', (error) => {
      this.log.error(`Socket error: ${error.message}`);
    });

    this.client.on('close', () => {
      this.isLoggedIn = false;
      this.socketIsOpen = false;
      this.log.warning(`The WS connection has closed`);
    });

    return this;
  }

  send(topic, msg) {
    let result = false;

    if (this.client && this.socketIsOpen && (this.isLoggedIn || topic === 'login' || topic === 'addNode')) {
      result = this.client.write({
        topic: topic,
        msg: msg
      });

      this.log.info(`Sending message on topic: "${topic}"`);
      this.log.debug(`"${topic}" message: ${JSON.stringify(msg, null, 4)}`);
    }

    return result;
  }

  askNodeName() {
    this.inquirer.prompt([
      {
        type: 'input',
        name: 'nodeName',
        message: 'Please enter node name:'
      }
    ]).then((answer) => {
      if (answer.nodeName !== undefined && answer.nodeName !== '') {
        this.addNode(answer.nodeName);
      }
    });
  }

  addNode(nodeName) {
    this.send('addNode', {
      nodeName: nodeName
    });
  }

  resolveAddNodeResponse(response) {
    let getUniqueHash = () => {
      let result = '';
      let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (let i = 0; i < 5; i++) {
        result += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      return result;
    };

    if (response.success === false) {
      this.log.error(response.error);
      if (!this.cli.flags.register) {
        this.askNodeName();
      } else {
        this.addNode(`${response.nodeName}-${getUniqueHash()}`);
      }
    } else {
      this.config.configStore.set('nodeName', response.nodeName);
      this.config.configStore.set('secretKey', response.secretKey);
      this.config.configStore.set('firstRun', false);
    }
  }

  login(params) {
    let intervalId = setInterval(() => {
      if (this.socketIsOpen) {
        clearInterval(intervalId);
        return this.send('login', params);
      }
    }, 1000);
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
      this.log.info('Successfully logged in');
    } else {
      this.log.error(response.error);
    }

    this.isLoggedIn = response.isLoggedIn;
  }

}
