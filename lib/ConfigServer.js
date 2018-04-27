import requestPromise from 'request-promise';

export default class ConfigServer {
  constructor(diContainer) {
    this.config = diContainer.config;
    this.log = diContainer.logger;
    this.lodash = diContainer.lodash;
    this.requestPromise = requestPromise;
  }

  get(params) {
    let requestOptions = {
      method: 'GET',
      uri: `${this.config.configServer.url}/configs/${params.configName}`,
      json: true
    };

    if (!this.lodash.isEmpty(params.configParams)) {
      let configParamsValue = '';
      Object.keys(params.configParams).forEach((param) => {
        configParamsValue += `configParams[${param}]=${params.configParams[param]}`;
      });

      requestOptions.uri += `?${configParamsValue}`;
    }

    this.log.debug(`Request config from server: ${JSON.stringify(requestOptions)}`);

    return this.requestPromise(requestOptions).then((requestResult) => {
      let result = null;
      if (requestResult.body.success) {
        result = requestResult.body.data[0];
      } else {
        this.log.error(`ConfigServer => ${requestResult.body.errors[0]}`, false, true);
      }

      return result;
    }).catch((error) => {
      let errorMessage = this.lodash.isObject(error.error) ? ((error.error.body === undefined) ? error.error: error.error.body.errors[0]) : error.message;
      this.log.error(`ConfigServer => ${errorMessage}`, false, true);
    });
  }
}