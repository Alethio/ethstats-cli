import Socket from './Socket.js';
import inquirer from 'inquirer';
import Logger from './Logger.js'
import config from './Config.js';
import pkg from '../package.json';
import CLI from './Cli.js';
import nodeCleanup from 'node-cleanup';
import meow from 'meow';
import chalk from 'chalk';
import boxen from 'boxen';
import lodash from 'lodash';
import updateNotifier from 'update-notifier';

updateNotifier({pkg}).notify();

const diContainer = {
  inquirer: inquirer,
  config: config,
  pkg: pkg,
  meow: meow,
  chalk: chalk,
  boxen: boxen,
  lodash: lodash,
  logger: new Logger(config.logger)
};

diContainer.cli = new CLI(diContainer);

const socket = new Socket(diContainer);

nodeCleanup((exitCode, signal) => {
  socket.logout();
  socket.destroy();
  diContainer.logger.info(`Exited with code: ${exitCode}, signal: ${signal}`);
});
