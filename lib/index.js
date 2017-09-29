import Socket from './socket.js';
import Rpc from './rpc.js';
import inquirer from 'inquirer';
import Logger from './logger.js'
import config from './config.js';
import pkg from '../package.json';
import cli from './cli.js';
import nodeCleanup from 'node-cleanup';

config.logger.showInfos = (cli.flags.verbose === undefined) ? config.logger.showInfos : cli.flags.verbose;
config.logger.showDebugs = (cli.flags.json === undefined) ? config.logger.showDebugs : cli.flags.json;

const appContainer = {
  inquirer: inquirer,
  cli: cli,
  config: config,
  pkg: pkg,
  logger: new Logger(config.logger)
};

const socket = new Socket(appContainer);
appContainer.socket = socket;
const rpc = new Rpc(appContainer);

socket.client.on('open', () => {
  if (config.configStore.has('firstRun') && config.configStore.get('firstRun') === false) {
    if (cli.flags.register) {
      appContainer.logger.warning(`Client already registered`);
    }

    rpc.connect();
  } else {
    if (cli.flags.register === undefined) {
      socket.askNodeName();
    } else {
      if (typeof cli.flags.register !== 'boolean') {
        socket.addNode(cli.flags.register);
      } else {
        appContainer.logger.error(`Invalid node name specified`);
        process.exit();
      }
    }

    let intervalId = setInterval(() => {
      if (config.configStore.get('nodeName') !== undefined && config.configStore.get('secretKey') !== undefined) {
        rpc.connect();
        clearInterval(intervalId);
      }
    }, 1000);
  }
});

socket.client.on('data', (data) => {
  appContainer.logger.info(`Data received for topic: "${data.topic}"`);

  switch (data.topic) {
    case 'addNodeResponse':
      socket.resolveAddNodeResponse(data.message);
      break;
    case 'loginResponse':
      socket.resolveLoginResponse(data.message);
      break;
    case 'validationError':
      appContainer.logger.error(`Validation error: ${JSON.stringify(data.message.errors, null, 4)}`);
      break;
    case 'getBlockHashes':
      rpc.getBlockHashes(data.message);
      break;
    case 'checkChainResponse':
      rpc.resolveCheckChainResponse(data.message);
      break;
    default:
      appContainer.logger.info(`Undefined topic: ${data.topic}`);
      break;
  }
});

nodeCleanup((exitCode, signal) => {
  socket.logout();
  socket.client.destroy();
  appContainer.logger.info(`Exited with code: ${exitCode}`);
});
