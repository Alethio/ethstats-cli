const chalk = require('chalk');
const pm2 = require('pm2');

const meow = require('meow');
const cli = meow();



pm2.connect((err) => {

  if (err) {
    console.error(err);
    process.exit(2);
  }

  if (cli.flags.daemon === 'start') {
    pm2.start({
      script: '../bin/ethstats-cli.js'
    }, (error) => {
      console.log(`Ethstats daemon START ${(!error) ? chalk.green('[OK]') : chalk.red('[FAILED]')}`);
      pm2.disconnect();
    });
  }

  if (cli.flags.daemon === 'stop') {
    pm2.stop('ethstats-cli', (error) => {
      console.log(`Ethstats daemon STOP ${(!error) ? chalk.green('[OK]') : chalk.red('[FAILED]')}`);
      pm2.disconnect();
    });
  }

  if (cli.flags.daemon === 'list') {
    pm2.list((err, apps) => {
      apps.forEach((app) => {
        console.log(`Name: ${app.name}`);
        console.log(`PID: ${app.pid}`);
        console.log(`Status: ${app.pm2_env.status}`);
        console.log(`Autorestart: ${app.pm2_env.autorestart}`);
        console.log(`Restart times: ${app.pm2_env.restart_time}`);
        console.log(`Instances: ${app.pm2_env.instances}`);
        console.log(`CPUs: ${app.monit.cpu}`);
        console.log(`Memory usage: ${app.monit.memory}`);
      });
      pm2.disconnect();
    });
  }

});



