import chalk from 'chalk';
import sprintfJS from 'sprintf-js';

export default class Logger {
  constructor(options) {
    options = options || {};
    this.showDateTime = (options.showDateTime === undefined) ? true : options.showDateTime;
    this.showInfos = (options.showInfos === undefined) ? true : options.showInfos;
    this.showWarnings = (options.showWarnings === undefined) ? true : options.showWarnings;
    this.showErrors = (options.showErrors === undefined) ? true : options.showErrors;
    this.showDebugs = (options.showDebugs === undefined) ? true : options.showDebugs;

    this.chalk = chalk;
    this.sprintf = sprintfJS.sprintf;
  }

  _log(type, string) {
    let dateTime = new Date().toISOString().replace('T', ' ').replace('Z', '');
    let resultString = `${(this.showDateTime) ? dateTime : ''} - %s: ${string}`;

    switch (type) {
      case 'info':
        console.log(this.chalk.white(this.sprintf(resultString, 'INFO')));
        break;
      case 'debug':
        console.log(this.chalk.cyan(this.sprintf(resultString, 'DEBUG')));
        break;
      case 'warning':
        console.log(this.chalk.yellow(this.sprintf(resultString, 'WARNING')));
        break;
      case 'error':
        console.log(this.chalk.red(this.sprintf(resultString, 'ERROR')));
        break;
    }
  }

  info(string) {
    if (this.showInfos) {
      this._log('info', string);
    }
  }

  debug(string) {
    if (this.showDebugs) {
      this._log('debug', string);
    }
  }

  warning(string) {
    if (this.showWarnings) {
      this._log('warning', string);
    }
  }

  error(string) {
    if (this.showErrors) {
      this._log('error', string);
    }
  }

}
