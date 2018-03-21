const REGEX_EMAIL_VALIDATOR = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default class Register {
  constructor(diContainer) {
    this.config = diContainer.config;
    this.cli = diContainer.cli;
    this.inquirer = diContainer.inquirer;
    this.log = diContainer.logger;
    this.lodash = diContainer.lodash;
    this.socket = diContainer.socket;
  }

  askInstallationType(askNetwork = true) {
    this.inquirer.prompt([
      {
        type: 'list',
        name: 'installationType',
        message: 'Do you wish to install as new node or as an existing one ?',
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
    ]).then((answer) => {
      if (askNetwork) {
        this.askNetwork(answer.installationType);
      } else {
        if (answer.installationType === 'new-node') {
          this.askRegistration();
        } else {
          this.askRecoveryAccountEmail();
        }
      }
    });
  }

  askNetwork(installationType) {
    let choices = [];

    if (this.lodash.isEmpty(this.config.socketServerConnection)) {
      this.log.error(`Networks not found`, false, true);
    } else {
      Object.keys(this.config.socketServerConnection).forEach((item) => {
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
    ]).then((answer) => {
      let serverConfig = this.config.socketServerConnection[answer.networkName];
      if (serverConfig) {
        this.socket.host = serverConfig.host;
        this.socket.port = serverConfig.port;
        this.socket.socketServerConfigToSave = {
          net: answer.networkName,
        };

        this.socket.create();
        this.socket.client.on('open', () => {
          if (this.config.configStore.get('firstRun') !== false) {
            if (installationType === 'new-node') {
              this.askRegistration();
            } else {
              this.askRecoveryAccountEmail();
            }
          }
        });
      } else {
        this.log.error(`Server config for selected network not found`, false, true);
      }
    });
  }

  askRegistration() {
    this.inquirer.prompt([
      {
        type: 'input',
        name: 'accountEmail',
        message: 'Please enter account email:',
        validate: (input) => {
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
        validate: (input) => {
          return this.socket.sendAndWait('checkIfNodeExists', {nodeName: input}).then((response) => {
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
    ]).then((answer) => {
      this.socket.registerNode(answer.accountEmail, answer.nodeName);
    });
  }

  askRecoveryAccountEmail() {
    this.inquirer.prompt([
      {
        type: 'input',
        name: 'accountEmail',
        message: 'Please enter account email:',
        validate: (input) => {
          return this.socket.sendAndWait('checkIfEmailExists', {accountEmail: input}).then((response) => {
            let result = true;
            if (response.success) {
              let resposeData = response.data[0];

              if (!resposeData.exists) {
                result = 'Email does not exists';
              }
            } else {
              result = response.errors[0];
            }

            return result;
          });
        }
      }
    ]).then((answer) => {
      this.socket.sendAndWait('sendRecoveryEmail', {accountEmail: answer.accountEmail}).then((response) => {
        if (response.success) {
          this.log.echo(`A message was sent to the provided address with a URL that will contain your list of nodes.`);
          this.log.echo(`To use an existing node, type the corresponding recovery hash of your desired node.`);

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
        validate: (input) => {
          return this.socket.sendAndWait('checkIfNodeRecoveryHashExists', {
            recoveryRequestId: recoveryRequestId,
            nodeRecoveryHash: input
          }).then((response) => {
            let result = true;
            if (response.success) {
              let resposeData = response.data[0];

              if (!resposeData.exists) {
                result = 'Node recovery hash is invalid/expired or does not exists';
              }
            } else {
              result = response.errors[0];
            }

            return result;
          });
        }
      }
    ]).then((answer) => {
      this.socket.send('recoverNode', {
        recoveryRequestId: recoveryRequestId,
        nodeRecoveryHash: answer.nodeRecoveryHash
      });
    });
  }
}