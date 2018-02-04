const meow = require('meow');
const boxen = require('boxen');
const chalk = require('chalk');
const updateNotifier = require('update-notifier');
const pkg = require('../package.json');
const logUpdate = require('log-update');
// const logSymbols = require('log-symbols');
// const cliCursor = require('cli-cursor');
// const Ora = require('ora');

updateNotifier({pkg}).notify();

const boxOptions = {
  padding: 1,
  align: 'center',
  borderColor: 'yellow',
  borderStyle: 'round'
};

const description = boxen(chalk.green.bold(pkg.description) +
  ' \n' + chalk.cyan('v' + pkg.version), boxOptions);

const cli = meow({
  help: [
    'Usage',
    '  $ ethstats',
    '',
    'Options',
    '  --help, -h             Show help',
    '  --version, -V          Show version',
    '  --debug, -d            Output values sent to server',
    '  --verbose, -v          Output more detailed information',
    ' '
  ],
  description
}, {
  alias: {
    h: 'help',
    V: 'version',
    d: 'debug',
    v: 'verbose',
    r: 'register'
  }
});

logUpdate.clear();
logUpdate(description);
logUpdate.done();

/*
const boxMessage = 'Update available ' + chalk.dim(cli.pkg.version) + chalk.reset(' → ') +
    chalk.green(cli.pkg.version) + ' \nRun ' + chalk.cyan('npm i -g ' + cli.pkg.name) + ' to update';

const message = '\n' + boxen(boxMessage, boxOptions);

// cliCursor.hide();
logUpdate.clear();
logUpdate(message);
*/

export default cli;
