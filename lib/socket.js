import Primus from 'primus';
import inquirer from 'inquirer';
import config from './config.js';

const PrimusSocket = Primus.createSocket({
  transformer: 'websockets',
  parser: 'JSON'
});

export default class Socket {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.isLoggedIn = false;
    this.socketIsOpened = false;
    this.client = new PrimusSocket(`${this.host}:${this.port}`);

    this.client.on('open', () => {
      this.socketIsOpened = true;
      console.log('Connection established with the server.');
    });

    this.client.on('error', (error) => {
      console.error('Socket error: ', error.stack);
    });

    this.client.on('data', (data) => {
      console.log(`Data received for topic: ${data.topic}`);

      switch (data.topic) {
        case 'addNodeResponse':
          this.resolveAddNodeResponse(data.message);
          break;
        case 'loginResponse':
          if (data.message.isLoggedIn) {
            console.log('Successfully logged in');
          } else {
            console.log(data.message.error);
          }
          this.isLoggedIn = data.message.isLoggedIn;
          break;
        case 'validationError':
          console.log(data.message.error);
          break;
        default:
          console.log(`Undefined topic: ${data.topic}`);
          break;
      }
    });

    return this;
  }

  send(topic, msg) {
    console.log("====>", topic);
    console.log(msg);

    let result = false;

    if (this.client) {
      result = this.client.write({
        topic: topic,
        msg: msg
      });
    }

    return result;
  }

  askNodeName() {
    inquirer.prompt([
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
      console.log(response.error);
      this.askNodeName();
    } else {
      config.set('nodeName', response.nodeName);
      config.set('secretKey', response.secretKey);
      config.set('firstRun', false);
    }
  }

  login(params) {
    return this.send('login', params);
  }

}
