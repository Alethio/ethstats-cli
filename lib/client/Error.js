export default class Error {
  constructor(protocol) {
    this.protocol = protocol;

    let _parityRecommendedFlags = {
      http: '`--jsonrpc-apis=web3,eth,net`',
      ws: '`--ws-apis=web3,eth,net,pubsub`',
      ipc: '`--ipc-apis=web3,eth,net,pubsub`'
    };

    let _gethRecommendedFlags = {
      http: '`--rpc --rpcapi web3,eth,net`',
      ws: '`--ws --wsapi web3,eth,net,pubsub`',
      ipc: 'the `--ipcdisable` off'
    };

    this.solutions = {
      'Invalid JSON RPC response: (""|undefined)': {
        showOriginal: true,
        solution: '=> Possible fix: Make sure the Ethereum node is running and has the RPC apis enabled.'
      },
      'Method not found': {
        showOriginal: true,
        solution: `=> Possible fix: Parity must be run with ${_parityRecommendedFlags[protocol]} to enable the necessary apis.`
      },
      'The method (\\w+) does not exist/is not available': {
        showOriginal: true,
        solution: `=> Possible fix: Geth must be run with ${_gethRecommendedFlags[protocol]} to enable the necessary apis.`
      },
      'etherbase must be explicitly specified': {
        showOriginal: true,
        solution: '=> Possible fix: Geth must have at least one account created. Try running `geth account new`.'
      },
      'not supported': {
        showOriginal: true,
        solution: '=> Possible fix: Make sure the RPC apis are enabled. If you are running Geth in `light` mode, some methods are not supported.'
      },
      'Returned error: This request is not implemented yet. Please create an issue on Github repo.': {
        showOriginal: false,
        solution: '=> Parity does not support "sync" subscription if the WebSocket provider is used'
      }
    };
  }

  getSolution(errorMessage) {
    let solution = '';
    let solutionsRegexArray = Object.keys(this.solutions);

    for (let i = 0; i < solutionsRegexArray.length; i++) {
      if (errorMessage.match(RegExp(solutionsRegexArray[i], 'i'))) {
        if (this.solutions[solutionsRegexArray[i]].showOriginal) {
          solution = `${errorMessage} ${this.solutions[solutionsRegexArray[i]].solution}`;
        } else {
          solution = this.solutions[solutionsRegexArray[i]].solution;
        }

        break;
      }
    }

    if (!solution) {
      solution = errorMessage;
    }

    return solution;
  }

  resolve(error) {
    let solution = this.getSolution(error.message);
    return solution;
  }
}
