const REGEX_EMAIL_VALIDATOR = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default class Register {
  constructor(diContainer) {
    this.config = diContainer.config;
    this.cli = diContainer.cli;
    this.inquirer = diContainer.inquirer;
    this.log = diContainer.logger;
    this.lodash = diContainer.lodash;
    this.server = diContainer.server;
    this.configurator = diContainer.configurator;
    this.chalk = diContainer.chalk;
  }

  askInstallationType(askNetwork = true) {
    this.configurator.get({
      configName: 'privacyPolicyUrl'
    }).then(privacyPolicyUrl => {
      if (privacyPolicyUrl === null) {
        this.log.error('Could not get privacy policy url', false, true);
      } else {
        this.log.echo(this.chalk.bgBlue('Thank you for using \'ethstats-cli\'. Your privacy is important to us.'));
        this.log.echo(this.chalk.bgBlue(`For this we kindly ask you to read our privacy policy here: ${this.chalk.redBright(privacyPolicyUrl)}`));
        this.log.echo(this.chalk.bgBlue('By continuing to the next step you acknowledge and agree to our terms and conditions.'));

        this.inquirer.prompt([
          {
            type: 'list',
            name: 'installationType',
            message: 'Is your node already registered ?',
            choices: [
              {
                name: 'New node',
                value: 'new-node'
              },
              {
                name: 'Existing node',
                value: 'existing-node'
              }
            ]
          }
        ]).then(answer => {
          if (askNetwork) {
            this.askNetwork(answer.installationType);
          } else if (answer.installationType === 'new-node') {
            this.askRegistration();
          } else {
            this.askRecoveryAccountEmail();
          }
        });
      }
    });
  }

  askNetwork(installationType) {
    let choices = [];

    if (this.lodash.isEmpty(this.config.serverUrls)) {
      this.log.error('Networks not found', false, true);
    } else {
      Object.keys(this.config.serverUrls).forEach(item => {
        choices.push({
          name: item.charAt(0).toUpperCase() + item.slice(1),
          value: item
        });
      });
    }

    this.inquirer.prompt([
      {
        type: 'list',
        name: 'networkName',
        message: 'Please select network ?',
        choices: choices
      }
    ]).then(answer => {
      let serverConfig = this.config.serverUrls[answer.networkName];
      if (serverConfig) {
        this.server.url = serverConfig.url;
        this.server.configToSave = {
          net: answer.networkName
        };

        this.server.create();
        this.server.socket.on('open', () => {
          if (this.config.configStore.get('firstRun') !== false) {
            if (installationType === 'new-node') {
              this.askRegistration();
            } else {
              this.askRecoveryAccountEmail();
            }
          }
        });
      } else {
        this.log.error('Server config for selected network not found', false, true);
      }
    });
  }

  askRegistration() {
    this.inquirer.prompt([
      {
        type: 'input',
        name: 'accountEmail',
        message: 'Please enter account email:',
        validate: input => {
          let result = true;

          if (!REGEX_EMAIL_VALIDATOR.test(input)) {
            result = 'Please enter a valid email address';
          }

          return result;
        }
      },
      {
        type: 'input',
        name: 'nodeName',
        message: 'Please enter node name:',
        validate: input => {
          return this.server.sendAndWait('checkIfNodeExists', {nodeName: input}).then(response => {
            let result = true;
            if (response.success) {
              let resposeData = response.data[0];

              if (resposeData.exists) {
                result = 'Node already registered';
              }
            } else {
              result = response.errors[0];
            }

            return result;
          });
        }
      }
    ]).then(answer => {
      this.server.registerNode(answer.accountEmail, answer.nodeName);
    });
  }

  askRecoveryAccountEmail() {
    this.inquirer.prompt([
      {
        type: 'input',
        name: 'accountEmail',
        message: 'Please enter account email:',
        validate: input => {
          return this.server.sendAndWait('checkIfEmailExists', {accountEmail: input}).then(response => {
            let result = true;
            if (response.success) {
              let resposeData = response.data[0];

              if (!resposeData.exists) {
                result = 'Email does not exist';
              }
            } else {
              result = response.errors[0];
            }

            return result;
          });
        }
      }
    ]).then(answer => {
      this.server.sendAndWait('sendRecoveryEmail', {accountEmail: answer.accountEmail}).then(response => {
        if (response.success) {
          this.log.echo('A message was sent to the provided address with a URL that will contain your list of nodes.');
          this.log.echo('To use an existing node, type the corresponding recovery hash of your desired node.');

          let responseData = response.data[0];
          this.askNodeRecoveryHash(responseData.recoveryRequestId);
        } else {
          this.log.error(response.errors[0], false, true);
        }
      });
    });
  }

  askNodeRecoveryHash(recoveryRequestId) {
    this.inquirer.prompt([
      {
        type: 'input',
        name: 'nodeRecoveryHash',
        message: 'Please enter node recovery hash:',
        validate: input => {
          return this.server.sendAndWait('checkIfNodeRecoveryHashExists', {
            recoveryRequestId: recoveryRequestId,
            nodeRecoveryHash: input
          }).then(response => {
            let result = true;
            if (response.success) {
              let resposeData = response.data[0];

              if (!resposeData.exists) {
                result = 'Node recovery hash is invalid/expired or does not exist';
              }
            } else {
              result = response.errors[0];
            }

            return result;
          });
        }
      }
    ]).then(answer => {
      this.server.send('recoverNode', {
        recoveryRequestId: recoveryRequestId,
        nodeRecoveryHash: answer.nodeRecoveryHash
      });
    });
  }
}
