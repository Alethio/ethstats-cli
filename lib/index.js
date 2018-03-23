import pkg from '../package.json';

import meow from 'meow';
import chalk from 'chalk';
import boxen from 'boxen';
import lodash from 'lodash';
import inquirer from 'inquirer';
import nodeCleanup from 'node-cleanup';
import updateNotifier from 'update-notifier';

import config from './Config.js';
import ConfigServer from './ConfigServer';
import Logger from './Logger.js';
import CLI from './Cli.js';
import Register from './Register.js';
import Socket from './Socket.js';

updateNotifier({pkg}).notify();

const diContainer = {
  inquirer: inquirer,
  config: config,
  pkg: pkg,
  meow: meow,
  chalk: chalk,
  boxen: boxen,
  lodash: lodash
};

const log = new Logger(config.logger);
diContainer.logger = log;

const cli = new CLI(diContainer);
diContainer.cli = cli;

const configServer = new ConfigServer(diContainer);
diContainer.configServer = configServer;

const socket = new Socket(diContainer);
diContainer.socket = socket;

const register = new Register(diContainer);
diContainer.register = register;

const initApp = () => {
  if (config.configStore.get('firstRun') !== false) {
    log.echo(`First run detected. Please follow instructions to register your node.`);
  }

  let isConfigServer = !cli.flags.net && config.configStore.has('socketServer') && config.configStore.get('socketServer').host && config.configStore.get('socketServer').port;
  let isCustomServer = cli.flags.serverHost && cli.flags.serverPort;

  if (isConfigServer || isCustomServer) {
    socket.create();
    socket.client.on('open', () => {
      if (config.configStore.get('firstRun') !== false) {
        if (cli.flags.register) {
          socket.registerNode(cli.flags.accountEmail, cli.flags.nodeName);
        } else {
          register.askInstallationType(false);
        }
      }
    });
  } else {
    log.info(`Get server connections`);
    configServer.get({
      configName: 'serverConnection'
    }).then((configValue) => {
      if (configValue !== null) {
        diContainer.config.socketServerConnection = configValue;

        if (config.configStore.get('firstRun') === false) {
          socket.create();
        } else {
          if (!cli.flags.net && !cli.flags.register) {
            register.askInstallationType(true);
          } else {
            socket.create();
            socket.client.on('open', () => {
              if (config.configStore.get('firstRun') !== false) {
                if (cli.flags.register) {
                  socket.registerNode(cli.flags.accountEmail, cli.flags.nodeName);
                } else {
                  register.askInstallationType(false);
                }
              }
            });
          }
        }

      } else {
        log.error(`Could not get server connections`, false, true);
      }
    });
  }
};

initApp1();

nodeCleanup((exitCode, signal) => {
  if (socket && socket.client) {
    socket.logout();
    socket.destroy();
  }

  log.info(`Exited with code: ${exitCode}, signal: ${signal}`);
});
