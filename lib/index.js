import Socket from './socket.js';
import Rpc from './rpc.js';
import inquirer from 'inquirer';
import Logger from './logger.js'
import config from './config.js';
import pkg from '../package.json';
import CLI from './cli.js';
import Register from './register.js';
import nodeCleanup from 'node-cleanup';
import meow from 'meow';
import chalk from 'chalk';
import boxen from 'boxen';
import updateNotifier from 'update-notifier';

updateNotifier({pkg}).notify();

const diContainer = {
  inquirer: inquirer,
  config: config,
  pkg: pkg,
  meow: meow,
  chalk: chalk,
  boxen: boxen,
  logger: new Logger(config.logger)
};

const cli = new CLI(diContainer);
diContainer.cli = cli;

const socket = new Socket(diContainer);
diContainer.socket = socket;

const register = new Register(diContainer);
const rpc = new Rpc(diContainer);

socket.client.on('open', () => {
  if (config.configStore.get('firstRun') === false) {
    if (config.configStore.get('nodeName') !== undefined && config.configStore.get('secretKey') !== undefined) {
      if (cli.flags.register) {
        diContainer.logger.warning(`Client already registered`);
      }

      rpc.connect();
    } else {
      diContainer.logger.info(`Credentials not found. Delete config file and try again. (rm -rf ~/.config/configstore/ethstats-cli.json)`, false, true);
    }
  } else {
    if (!cli.flags.register) {
      diContainer.logger.echo(`First run detected. Please follow instructions to register your node.`);
      register.askInstallationType();
    } else {
      register.registerNode(cli.flags.accountEmail, cli.flags.nodeName);
    }

    let intervalId = setInterval(() => {
      if (config.configStore.get('firstRun') === false && config.configStore.get('nodeName') !== undefined && config.configStore.get('secretKey') !== undefined) {
        rpc.connect();
        clearInterval(intervalId);
      }
    }, 1000);
  }
});

socket.client.on('data', (data) => {
  diContainer.logger.info(`Data received for topic: "${data.topic}"`);

  switch (data.topic) {
    case 'registerNodeResponse':
      register.resolveRegisterNodeResponse(data.message);
      break;
    case 'loginResponse':
      socket.resolveLoginResponse(data.message);
      break;
    case 'validationError':
      diContainer.logger.error(`Validation error: ${JSON.stringify(data.message.errors, null, 4)}`);
      break;
    case 'getBlockHashes':
      rpc.getBlockHashes(data.message);
      break;
    case 'checkChainResponse':
      rpc.resolveCheckChainResponse(data.message);
      break;
    default:
      diContainer.logger.info(`Undefined topic: ${data.topic}`);
      break;
  }
});

nodeCleanup((exitCode, signal) => {
  socket.logout();
  socket.client.destroy();
  diContainer.logger.info(`Exited with code: ${exitCode}, signal: ${signal}`);
});
