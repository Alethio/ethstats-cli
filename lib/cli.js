export default class CLI {
  constructor(diContainer) {
    this.pkg = diContainer.pkg;
    this.chalk = diContainer.chalk;
    this.meow = diContainer.meow;
    this.boxen = diContainer.boxen;
    this.log = diContainer.logger;

    let boxOptions = {
      padding: 1,
      margin: 1,
      align: 'center',
      borderColor: 'yellow',
      borderStyle: 'round'
    };
    let description = this.boxen(this.chalk.green.bold(this.pkg.description) + ' \n' + this.chalk.cyan('v' + this.pkg.version), boxOptions);

    let cli = this.meow(`
    Usage
      $ ethstats-cli <input>
 
    Options
      --help, -h                Show help
      --version, -V             Show version
      --debug, -d               Output values sent to server
      --verbose, -v             Output more detailed information
      
      --rpc-host                RPC Host (Default: http://localhost)
      --rpc-port                RPC Port (Default: 8545)
      
      --register, -r            Register node in non-interactive mode
        --account-email         Account identification, also used in case of node/secret-key recovery
                                It is possible to have multiple nodes under the same account-email
        --node-name             Name of the node. If node is already registered, a unique 5 char hash will be appended.
      
`, {
      description: description,
      flags: {
        help: {
          type: 'boolean',
          alias: 'h'
        },
        version: {
          type: 'boolean',
          alias: 'V'
        },
        debug: {
          type: 'boolean',
          alias: 'd'
        },
        verbose: {
          type: 'boolean',
          alias: 'v'
        },
        rpcHost: {
          type: 'string'
        },
        rpcPort: {
          type: 'string'
        },
        register: {
          type: 'boolean',
          alias: 'r'
        },
        accountEmail: {
          type: 'string'
        },
        nodeName: {
          type: 'string'
        }
      }
    });

    diContainer.config.logger.showInfos = cli.flags.verbose;
    diContainer.config.logger.showDebugs = cli.flags.debug;

    if (diContainer.config.logger.showDebugs && !diContainer.config.logger.showInfos) {
      diContainer.config.logger.showInfos = true;
    }

    diContainer.logger.showInfos = diContainer.config.logger.showInfos;
    diContainer.logger.showDebugs = diContainer.config.logger.showDebugs;
    diContainer.logger.showDateTime = diContainer.config.logger.showInfos;

    if (cli.flags.rpcHost === true || cli.flags.rpcHost === '') {
      this.log.error('RPC Host is empty', false, true);
    }

    if (cli.flags.rpcPort === true || cli.flags.rpcPort === '') {
      this.log.error('RPC Port is empty', false, true);
    }

    if (cli.flags.register) {
      if (!cli.flags.accountEmail || cli.flags.accountEmail === true || cli.flags.accountEmail === '') {
        this.log.error('Account email is missing or empty', false, true);
      }
      if (!cli.flags.nodeName || cli.flags.nodeName === true || cli.flags.nodeName === '') {
        this.log.error('Node name is missing or empty', false, true);
      }
    } else {
      if (cli.flags.accountEmail !== undefined || cli.flags.nodeName !== undefined) {
        this.log.error('Register flag is missing', false, true);
      }
    }

    return cli;
  }
}
