import chalk from 'chalk';

export default class Logger {
  constructor(options) {
    options = options || {};
    this.showDateTime = (options.showDateTime === undefined) ? true : options.showDateTime;
    this.showInfos = (options.showInfos === undefined) ? true : options.showInfos;
    this.showWarnings = (options.showWarnings === undefined) ? true : options.showWarnings;
    this.showErrors = (options.showErrors === undefined) ? true : options.showErrors;
    this.showDebugs = (options.showDebugs === undefined) ? true : options.showDebugs;

    this.chalk = chalk;
  }

  _log(type, string, beginWithNewLine = false, processExit = false) {
    let dateTime = new Date().toISOString().replace('T', ' ').replace('Z', '');
    let newLine = beginWithNewLine ? '\n' : '';
    let resultString = `${newLine}${(this.showDateTime) ? dateTime + ' - ' : ''}%LOG-TYPE%: ${string}`;

    switch (type) {
      case 'echo':
        console.log(string);
        break;
      case 'info':
        console.log(this.chalk.white(resultString.replace('%LOG-TYPE%', 'INFO')));
        break;
      case 'debug':
        console.log(this.chalk.cyan(resultString.replace('%LOG-TYPE%', 'DEBUG')));
        break;
      case 'warning':
        console.log(this.chalk.yellow(resultString.replace('%LOG-TYPE%', 'WARNING')));
        break;
      case 'error':
        console.log(this.chalk.red(resultString.replace('%LOG-TYPE%', 'ERROR')));
        break;
      default:
        console.log('Unknown log type');
        break;
    }

    if (processExit) {
      process.exit((type === 'error' ? 1 : 0));
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
