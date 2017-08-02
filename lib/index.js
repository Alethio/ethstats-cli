import Socket from './socket.js';
import Rpc from './rpc.js';
import inquirer from 'inquirer';
import Logger from './logger.js'
import config from './config.js';
import pkg from '../package.json';
import cli from './cli.js';

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

if (config.configStore.has('firstRun') && config.configStore.get('firstRun') === false) {
  rpc.connect();
} else {
  socket.askNodeName();
  let intervalId = setInterval(() => {
    if (config.configStore.get('nodeName') !== undefined && config.configStore.get('secretKey') !== undefined) {
      rpc.connect();
      clearInterval(intervalId);
    }
  }, 1000);
}
