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
socket.client.on('open', () => {
  appContainer.socket = socket;
  const rpc = new Rpc(appContainer);

  if (config.configStore.has('firstRun') && config.configStore.get('firstRun') === false) {
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

nodeCleanup((exitCode, signal) => {
  socket.logout();
  socket.client.end();
  appContainer.logger.info(`Exited with code: ${exitCode}`);
});
