// import './cli.js';
import Socket from './socket.js';
import Rpc from './rpc.js';

const socket = new Socket();
console.log(socket);
const rpc = new Rpc(socket);

// rpc.connect('https://mainnet.infura.io/1QWE5wpxxvu3VZynv1TF');
rpc.connect('http://138.68.86.20', 8545);

// export default {};
