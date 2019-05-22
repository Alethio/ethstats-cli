import config from './Config.js';
import pm2 from 'pm2';
import chalk from 'chalk';
import moment from 'moment';

if (config.configStore.get('firstRun') !== false) {
  console.log('Your node is not registered. Please run "ethstats-cli" first.');
  process.exit(1);
}

const daemonOption = process.argv[2];
const daemonAvailableOptions = ['start', 'stop', 'restart', 'status', 'kill'];

if (!daemonAvailableOptions.includes(daemonOption)) {
  console.log(`
  ${chalk.bold('Ethstats Daemon')}
  
  Usage
    $ ethstats-daemon [options]
  
  Options
    start               Start daemon
    stop                Stop daemon
    restart             Restart daemon. If it is already started, the process will be stopped first.
    status              Show infos about the daemon.
    kill                Ethstats daemon uses PM2 as a process manager. This option will kill PM2 god daemon.
    
  If any CLI options are specified after the Daemon option, they will be forwarded to the forked process.
`);
  process.exit(1);
}

if (!process.argv.includes('-v')) {
  process.argv.push('-v');
}

const localDir = '~/.ethstats-cli';
const processOptions = {
  name: 'ethstats-cli',
  script: `${__dirname}/../bin/ethstats-cli.js`,
  pid: `${localDir}/ethstats-cli.pid`,
  error: `${localDir}/ethstats-cli.log`,
  output: `${localDir}/ethstats-cli.log`,
  args: process.argv,
  restartDelay: 1000
};

pm2.connect(err => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  if (daemonOption === 'start') {
    pm2.start(processOptions, error => {
      console.log(`Ethstats daemon START ${(error) ? chalk.red(`[FAILED] ${error.message}`) : chalk.green('[OK]')}`);
      pm2.disconnect();
    });
  }

  if (daemonOption === 'stop') {
    pm2.stop(processOptions.name, error => {
      console.log(`Ethstats daemon STOP ${(error) ? chalk.red(`[FAILED] ${error.message}`) : chalk.green('[OK]')}`);
      pm2.disconnect();
    });
  }

  if (daemonOption === 'restart') {
    pm2.restart(processOptions.name, error => {
      console.log(`Ethstats daemon RESTART ${(error) ? chalk.red(`[FAILED] ${error.message}`) : chalk.green('[OK]')}`);
      pm2.disconnect();
    });
  }

  if (daemonOption === 'status') {
    pm2.describe(processOptions.name, (error, arr) => {
      arr.forEach(app => {
        let uptime = (app.pm2_env.status === 'stopped') ? 0 : moment.duration(Date.now() - app.pm2_env.created_at).humanize();

        console.log(`Name: ${app.name}`);
        console.log(`PID: ${app.pid}`);
        console.log(`Status: ${app.pm2_env.status}`);
        console.log(`Uptime: ${uptime}`);
        console.log(`Autorestart: ${app.pm2_env.autorestart}`);
        console.log(`Restart times: ${app.pm2_env.restart_time}`);
        console.log(`Instances: ${app.pm2_env.instances}`);
        console.log(`CPU usage: ${app.monit.cpu}`);
        console.log(`MEM usage: ${app.monit.memory}`);
      });
      pm2.disconnect();
    });
  }

  if (daemonOption === 'kill') {
    pm2.killDaemon(error => {
      console.log(`Ethstats daemon KILL ${(error) ? chalk.red(`[FAILED] ${error.message}`) : chalk.green('[OK]')}`);
      pm2.disconnect();
      process.exit((error) ? 1 : 0);
    });
  }
});
