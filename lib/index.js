import cli from './cli.js';
import Socket from './socket.js';
import Rpc from './rpc.js';
import config from './config.js';

console.log(cli.input, cli.flags);

const socketServer = {
  host: 'http://localhost',
  port: '3000'
};
const rpcServer = {
  host: 'http://192.168.0.125',
  port: '8545'
};

const socket = new Socket(socketServer.host, socketServer.port);
const rpc = new Rpc(socket);

if (config.has('firstRun') && config.get('firstRun') === false) {
  console.log('Connect to RPC server');
  rpc.connect(rpcServer.host, rpcServer.port);
} else {
  socket.askNodeName();
  let intervalId = setInterval(() => {
    if (config.get('nodeName') !== undefined && config.get('secretKey') !== undefined) {
      rpc.connect(rpcServer.host, rpcServer.port);
      clearInterval(intervalId);
    }
  }, 1000);
}
