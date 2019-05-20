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
      $ ethstats-cli [options]
 
    Options
      --help, -h                Show help
      --version, -V             Show version
      --debug, -d               Output values sent to server
      --verbose, -v             Output more detailed information
      
      --server-url              Server URL (Must include protocol and port if any)
      --net, -n                 Specify Ethereum network your node is running on (Default: mainnet)
                                Available networks: mainnet|rinkeby|goerli
                                If --server-url is specified, this option is ignored

      --client-url              Client URL (Must include protocol and port if any; Default: http://localhost:8545)
                                Based on the protocol specified in the url (http | ws) the app sets the corresponding  Web3 provider  
                                If --client-ipc-path is specified, this option is ignored
      --client-ipc-path         Client IPC path
      
      --configurator-url        Configurator URL (Must include protocol and port if any). Custom configuration service to provide application specific configs. 
      
      --register, -r            Register node in non-interactive mode
        --account-email         Account identification, also used in case of node/secret-key recovery
                                It is possible to have multiple nodes under the same account-email
        --node-name             Name of the node. If node is already registered, a unique 5 char hash will be appended
      
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
        serverUrl: {
          type: 'string'
        },
        net: {
          type: 'string',
          alias: 'n'
        },
        clientUrl: {
          type: 'string'
        },
        clientIpcPath: {
          type: 'string'
        },
        configuratorUrl: {
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

    return this.validateFlags(cli);
  }

  validateFlags(cli) {
    if (cli.flags.configuratorUrl === true || cli.flags.configuratorUrl === '') {
      this.log.error('Configurator URL is empty', false, true);
    }

    if (cli.flags.clientUrl === true || cli.flags.clientUrl === '') {
      this.log.error('Client URL is empty', false, true);
    }

    if (cli.flags.clientIpcPath === true || cli.flags.clientIpcPath === '') {
      this.log.error('Client IPC Path is empty', false, true);
    }

    if (cli.flags.serverUrl === true || cli.flags.serverUrl === '') {
      this.log.error('Server URL is empty', false, true);
    }

    if (cli.flags.net === true || cli.flags.net === '') {
      this.log.error('Network is empty', false, true);
    }

    if (cli.flags.register) {
      if (!cli.flags.accountEmail || cli.flags.accountEmail === true || cli.flags.accountEmail === '') {
        this.log.error('Account email is missing or empty', false, true);
      }

      if (!cli.flags.nodeName || cli.flags.nodeName === true || cli.flags.nodeName === '') {
        this.log.error('Node name is missing or empty', false, true);
      }
    } else if (cli.flags.accountEmail !== undefined || cli.flags.nodeName !== undefined) {
      this.log.error('Register flag is missing', false, true);
    }

    return cli;
  }
}
