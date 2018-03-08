export default class Web3ErrorHandler {

  constructor() {
    this.solutions = {
      'Invalid JSON RPC response: (""|undefined)': '=> Possible fix: Make sure the Ethereum node is running and has the RPC apis enabled.',
      'Method not found': '=> Possible fix: Parity must be run with `--jsonrpc-apis=web3,eth,net` to enable the necessary apis.',
      'The method (\\w+) does not exist/is not available': '=> Possible fix: Geth must be run with `--rpc --rpcapi web3,eth,net` to enable the necessary apis.',
      'etherbase must be explicitly specified': '=> Possible fix: Geth must have at least one account created. Try running `geth account new`.',
      'not supported': '=> Possible fix: Make sure the RPC apis are enabled. If you are running Geth in `light` mode, some methods are not supported.'
    };
  }

  getSolution(errorMessage) {
    let solution = '';
    let solutionsRegexArray = Object.keys(this.solutions);

    for (let i = 0; i < solutionsRegexArray.length; i++) {
      if (errorMessage.match(RegExp(solutionsRegexArray[i], 'i'))) {
        solution = this.solutions[solutionsRegexArray[i]];
        break;
      }
    }

    return solution;
  }

  resolve(error) {
    let errorMessage = error.message;
    let solution = this.getSolution(errorMessage);

    if (errorMessage === 'not supported' || errorMessage === 'Method not found') {
      let caller = error.stack.split('at ')[4].split(' ')[0];
      errorMessage = `${caller} ${errorMessage}`;
    }

    return `${errorMessage} ${solution}`;
  }

}