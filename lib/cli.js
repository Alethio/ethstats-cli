const meow = require('meow');
const boxen = require('boxen');
const chalk = require('chalk');
const logUpdate = require('log-update');
// const logSymbols = require('log-symbols');
const updateNotifier = require('update-notifier');
const pkg = require('../package.json');
// const cliCursor = require('cli-cursor');
// const Ora = require('ora');

const boxOptions = {
  padding: 1,
  margin: 1,
  // float: 'center',
  align: 'center',
  borderColor: 'yellow',
  borderStyle: 'round'
};

const description = '\n' + boxen(chalk.green.bold('EthStats.net CLI client') +
    ' \n' + chalk.cyan('v' + pkg.version), boxOptions);

const cli = meow({
  help: [
    'Usage',
    '  $ ethstats',
    '',
    'Options',
    '  --json     Output the result as JSON',
    '  --bytes    Output the result in megabytes per second',
    '  --verbose  Output more detailed information',
    ' '
  ],
  description
}, {
  alias: {
    r: 'rainbow'
  }
});

const notifier = updateNotifier({pkg});

notifier.notify();

const boxMessage = 'Update available ' + chalk.dim(cli.pkg.version) + chalk.reset(' → ') +
    chalk.green(cli.pkg.version) + ' \nRun ' + chalk.cyan('npm i -g ' + cli.pkg.name) + ' to update';

const message = '\n' + boxen(boxMessage, boxOptions);

// cliCursor.hide();
logUpdate.clear();
logUpdate(message);
