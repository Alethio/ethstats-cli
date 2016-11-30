// import './cli.js';
import Socket from './socket.js';
import Rpc from './rpc.js';

const socket = new Socket();
console.log(socket);
const rpc = new Rpc(socket);

rpc.connect('https://mainnet.infura.io/1QWE5wpxxvu3VZynv1TF');

// export default {};
