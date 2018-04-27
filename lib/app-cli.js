import pkg from '../package.json';

import meow from 'meow';
import chalk from 'chalk';
import boxen from 'boxen';
import lodash from 'lodash';
import inquirer from 'inquirer';
import nodeCleanup from 'node-cleanup';
import updateNotifier from 'update-notifier';

import config from './Config.js';
import ConfigServer from './ConfigServer.js';
import Logger from './Logger.js';
import CLI from './Cli.js';
import Register from './Register.js';
import Server from './Server.js';

updateNotifier({pkg}).notify();

config.configServer.url = process.env.ETHSTATS_CONFIG_SERVER_URL || config.configServer.url;

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

const server = new Server(diContainer);
diContainer.server = server;

const register = new Register(diContainer);
diContainer.register = register;

const initApp = () => {
  if (config.configStore.get('firstRun') !== false) {
    log.echo(`First run detected. Please follow instructions to register your node.`);
  }

  let isConfigServer = !cli.flags.net && config.configStore.has('server') && config.configStore.get('server').url;

  if (isConfigServer || cli.flags.serverUrl) {
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
    log.info(`Get server connections`);
    configServer.get({
      configName: 'serverUrl'
    }).then((configValue) => {
      if (configValue !== null) {
        diContainer.config.serverUrls = configValue;

        if (config.configStore.get('firstRun') === false) {
          server.create();
        } else {
          if (!cli.flags.net && !cli.flags.register) {
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

      } else {
        log.error(`Could not get server connections`, false, true);
      }
    });
  }
};

initApp();

nodeCleanup((exitCode, signal) => {
  if (server && server.socket) {
    server.logout();
    server.destroy();
  }

  log.info(`Exited with code: ${exitCode}, signal: ${signal}`);
});
