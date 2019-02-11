import pkg from '../package.json';

import meow from 'meow';
import chalk from 'chalk';
import boxen from 'boxen';
import lodash from 'lodash';
import inquirer from 'inquirer';
import nodeCleanup from 'node-cleanup';
import updateNotifier from 'update-notifier';
import findProcess from 'find-process';
import systemInfo from 'systeminformation';

import config from './Config.js';
import Configurator from './Configurator.js';
import Logger from './Logger.js';
import CLI from './Cli.js';
import Register from './Register.js';
import Server from './Server.js';

updateNotifier({pkg}).notify();

const diContainer = {
  inquirer: inquirer,
  config: config,
  pkg: pkg,
  meow: meow,
  chalk: chalk,
  boxen: boxen,
  lodash: lodash,
  systemInfo: systemInfo
};

const log = new Logger(config.logger);
diContainer.logger = log;

const cli = new CLI(diContainer);
diContainer.cli = cli;

const configurator = new Configurator(diContainer);
diContainer.configurator = configurator;

let server = new Server(diContainer);
diContainer.server = server;

const register = new Register(diContainer);
diContainer.register = register;

const initApp = () => {
  if (config.configStore.get('firstRun') !== false) {
    log.echo('First run detected. Please follow instructions to register your node.');
  }

  let isServerFromConfigFile = !cli.flags.net && config.configStore.has('server') && config.configStore.get('server').url;

  if (isServerFromConfigFile || cli.flags.serverUrl) {
    server.create();
    server.socket.on('open', () => {
      if (config.configStore.get('firstRun') !== false) {
        if (cli.flags.register) {
          server.registerNode(cli.flags.accountEmail, cli.flags.nodeName);
        } else {
          register.askInstallationType(false);
        }
      }
    });
  } else {
    log.info('Get server connections');
    configurator.get({
      configName: 'serverUrl'
    }).then(configValue => {
      if (configValue === null) {
        log.error('Could not get server connections', false, true);
      } else {
        diContainer.config.serverUrls = configValue;

        if (config.configStore.get('firstRun') === false) {
          server.create();
        } else if (!cli.flags.net && !cli.flags.register) {
          register.askInstallationType(true);
        } else {
          server.create();
          server.socket.on('open', () => {
            if (config.configStore.get('firstRun') !== false) {
              if (cli.flags.register) {
                server.registerNode(cli.flags.accountEmail, cli.flags.nodeName);
              } else {
                register.askInstallationType(false);
              }
            }
          });
        }
      }
    });
  }

  server.eventEmitter.on('destroy', () => {
    log.info('Reinitializing app...');

    server.client.stop(true);
    server.destroy();

    server = new Server(diContainer);
    diContainer.server = server;

    initApp();
  });
};

findProcess('name', 'ethstats-cli').then(list => {
  log.debug(`Process list: ${JSON.stringify(list)}`);

  let processList = [];

  list.forEach(proc => {
    if (proc.name === 'ethstats-cli') {
      processList.push(proc);
    }
  });

  if (processList.length > 1) {
    log.error('Ethstats-CLI is already running', false, true);
  } else {
    initApp();
  }
});

nodeCleanup((exitCode, signal) => {
  if (server && server.socket) {
    server.logout();
    server.destroy();
  }

  log.info(`Exited with code: ${exitCode}, signal: ${signal}`);
});
