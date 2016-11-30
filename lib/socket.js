export default class Socket {
  constructor(host, port) {
    this.host = host;
    this.port = port;
    this.client = null;

    return this;
  }

  login(login) {
    this.client = deepstream(`${this.host}:${this.port}`).login(login);

    // this.client.on('connectionStateChanged', connectionState => {
    //   // TODO: display state in cli
    // })
  }

  send(topic, msg) {
    console.log("====>", topic);
    console.log(msg);
  }
}
