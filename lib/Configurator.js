import requestPromise from 'request-promise';

export default class Configurator {
  constructor(diContainer) {
    this.config = diContainer.config;
    this.log = diContainer.logger;
    this.lodash = diContainer.lodash;
    this.cli = diContainer.cli;
    this.requestPromise = requestPromise;

    this.url = this.config.configurator.url;

    let configStoreConfigurator = diContainer.config.configStore.get('configurator');
    if (configStoreConfigurator) {
      this.url = configStoreConfigurator.url;
    }

    if (this.cli.flags.configuratorUrl) {
      this.url = this.cli.flags.configuratorUrl;
      this.config.configStore.set('configurator', {url: this.url});
    }
  }

  get(params) {
    let requestOptions = {
      method: 'GET',
      uri: `${this.url}/configs/${params.configName}`,
      json: true
    };

    if (!this.lodash.isEmpty(params.configParams)) {
      let configParamsValue = [];
      Object.keys(params.configParams).forEach(param => {
        configParamsValue.push(`configParams[${param}]=${params.configParams[param]}`);
      });

      requestOptions.uri += `?${configParamsValue.join('&')}`;
    }

    this.log.debug(`Request config from server: ${JSON.stringify(requestOptions)}`);

    return this.requestPromise(requestOptions).then(requestResult => {
      let result = null;
      if (requestResult.body.success) {
        result = requestResult.body.data[0];
      } else {
        this.log.error(`Configurator => ${requestResult.body.errors[0]}`, false, true);
      }

      return result;
    }).catch(error => {
      let errorMessage = this.lodash.isObject(error.error) ? ((error.error.body === undefined) ? error.error : error.error.body.errors[0]) : error.message;
      let exit = params.configName === 'serverUrl';

      this.log.error(`Configurator => ${errorMessage}`, false, exit);
    });
  }
}
