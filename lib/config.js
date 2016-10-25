import Configstore from 'configstore';

const config = new Configstore('ethstats-cli', {firstRun: true});

export default config;
