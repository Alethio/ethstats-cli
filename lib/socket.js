import Primus from 'primus';

const PrimusSocket = Primus.createSocket({
  transformer: 'websockets',
  parser: 'JSON'
});

export default class Socket {
  constructor(appContainer) {
    this.pkg = appContainer.pkg;
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

    this.client = new PrimusSocket(`${this.host}:${this.port}`, {
      reconnect: {
        min: 300000, // every 5 minutes
        factor: 1,
        retries: 300 // retries for 25 hours
      }
    });
    this.client.on('open', () => {
      this.socketIsOpen = true;
      this.log.info(`Connection established with ethstats server "${this.host}:${this.port}"`);
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
      this.log.error(`Reconnect to ethstats server failed! Maximum attempts reached. Please try again later or contact ethstats support.`);
      process.exit();
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
        let newNodeName = `${response.nodeName}-${getUniqueHash()}`;
        this.log.echo(`Trying to register with suffix: ${newNodeName}`);
        this.addNode(newNodeName);
      }
    } else {
      this.log.echo(`Registered successfully node name: ${response.nodeName}`);
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
      this.log.echo(`Successfully logged in as "${this.config.configStore.get('nodeName')}"`);
      this.log.echo(`${this.pkg.description} started and running...`);
    } else {
      this.log.error(`Authentication error: ${response.error}`);
    }

    this.isLoggedIn = response.isLoggedIn;
  }

}
