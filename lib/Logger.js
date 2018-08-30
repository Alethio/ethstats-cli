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

  _log(type, string, beginWithNewLine = false, processExit = false) {
    let dateTime = new Date().toISOString().replace('T', ' ').replace('Z', '');
    let newLine = beginWithNewLine ? `\n` : ``;
    let resultString = `${newLine}${(this.showDateTime) ? dateTime + ' - ' : ''}%s: ${string}`;

    switch (type) {
      case 'echo':
        console.log(string);
        break;
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
      default:
        console.log('Unknown log type');
        break;
    }

    if (processExit) {
      process.exit();
    }
  }

  echo(string, beginWithNewLine = false, processExit = false) {
    if (this.showInfos) {
      this._log('info', string, beginWithNewLine, processExit);
    } else {
      this._log('echo', string);
    }
  }

  info(string, beginWithNewLine = false, processExit = false) {
    if (this.showInfos) {
      this._log('info', string, beginWithNewLine, processExit);
    }
  }

  debug(string, beginWithNewLine = false, processExit = false) {
    if (this.showDebugs) {
      this._log('debug', string, beginWithNewLine, processExit);
    }
  }

  warning(string, beginWithNewLine = false, processExit = false) {
    if (this.showWarnings) {
      this._log('warning', string, beginWithNewLine, processExit);
    }
  }

  error(string, beginWithNewLine = false, processExit = false) {
    if (this.showErrors) {
      this._log('error', string, beginWithNewLine, processExit);
    }
  }
}
