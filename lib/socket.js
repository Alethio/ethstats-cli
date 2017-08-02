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

    this.isLoggedIn = false;
    this.socketIsOpen = false;
    this.client = new PrimusSocket(`${this.config.socketServer.host}:${this.config.socketServer.port}`);

    this.client.on('open', () => {
      this.socketIsOpen = true;
      this.log.info(`Connection established with the server "${this.config.socketServer.host}:${this.config.socketServer.port}"`);
    });

    this.client.on('error', (error) => {
      this.log.error(`Socket error: ${error.stack}`)
    });

    this.client.on('data', (data) => {
      this.log.info(`Data received for topic: "${data.topic}"`);

      switch (data.topic) {
        case 'addNodeResponse':
          this.resolveAddNodeResponse(data.message);
          break;
        case 'loginResponse':
          this.resolveLoginResponse(data.message);
          break;
        case 'validationError':
          this.log.error(`Validation error: ${JSON.stringify(data.message.errors, null, 4)}`);
          break;
        default:
          this.log.info(`Undefined topic: ${data.topic}`);
          break;
      }
    });

    return this;
  }

  send(topic, msg) {
    let result = false;

    if (this.client && this.socketIsOpen && (this.isLoggedIn || topic === 'login')) {
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
        this.send('addNode', answer);
      }
    });
  }

  resolveAddNodeResponse(response) {
    if (response.success === false) {
      this.log.error(response.error);
      this.askNodeName();
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

  resolveLoginResponse(response) {
    if (response.isLoggedIn) {
      this.log.info('Successfully logged in');
    } else {
      this.log.error(response.error);
    }

    this.isLoggedIn = response.isLoggedIn;
  }

}
