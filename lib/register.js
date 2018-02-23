const REGEX_EMAIL_VALIDATOR = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

export default class Register {
  constructor(diContainer) {
    this.config = diContainer.config;
    this.cli = diContainer.cli;
    this.inquirer = diContainer.inquirer;
    this.log = diContainer.logger;
    this.socket = diContainer.socket;
  }

  askInstallationType() {
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
      if (answer.installationType === 'new-node') {
        this.askRegistration();
      } else {
        this.askRecoveryAccountEmail();
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
      this.registerNode(answer.accountEmail, answer.nodeName);
    });
  }

  registerNode(accountEmail, nodeName) {
    return this.socket.send('registerNode', {
      accountEmail: accountEmail,
      nodeName: nodeName
    });
  }

  resolveRegisterNodeResponse(response) {
    let responseData = response.data[0];
    let getUniqueHash = () => {
      let result = '';
      let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

      for (let i = 0; i < 5; i++) {
        result += possible.charAt(Math.floor(Math.random() * possible.length));
      }

      return result;
    };

    if (response.success === false) {
      let nodeAlreadyRegistered = false;

      response.errors.forEach((error) => {
        if (error === 'Node already registered') {
          nodeAlreadyRegistered = true;
        }

        if (!nodeAlreadyRegistered || (nodeAlreadyRegistered && !this.cli.flags.register)) {
          this.log.error(error, false, true);
        } else {
          this.log.warning(error);
        }
      });

      if (this.cli.flags.register && nodeAlreadyRegistered) {
        let newNodeName = `${responseData.nodeName}-${getUniqueHash()}`;
        this.log.echo(`Trying to register with suffix: ${newNodeName}`);
        this.registerNode(responseData.accountEmail, newNodeName);
      }
    } else {
      this.log.echo(`Registered successfully node name: ${responseData.nodeName}`);
      this.config.configStore.set('nodeName', responseData.nodeName);
      this.config.configStore.set('secretKey', responseData.secretKey);
      this.config.configStore.set('firstRun', false);
    }
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
          return this.socket.sendAndWait('checkIfNodeRecoveryHashExists', {recoveryRequestId: recoveryRequestId, nodeRecoveryHash: input}).then((response) => {
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