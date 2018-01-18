const mapServer = 'ws://localhost:8888',
      signalingServer = 'wss://p2p.ninja/signaler';

export {becomeBroadcaster};

function becomeBroadcaster(registeredCallback) {
  const signal = makeSignalingServerConnection(),
        mapServerSocket = makeMapServerConnection(id => {
                            signal.registerAs(id);
                            registeredCallback(id);
                          });

  function makeMapServerConnection(registeredCallback) {
    const socket = new WebSocket(mapServer);

    socket.addEventListener('open', () => {
      socket.send(JSON.stringify(['REGISTER_AS_BROADCASTER']));
    });

    socket.addEventListener('message', event => {
      const [type, message] = JSON.parse(event.data);

      switch (type) {
        case 'REGISTERED_AS_BROADCASTER':
          const {id:{data: id}} = message;
          registeredCallback(new Uint8Array(id));
          console.log('registered', id);
          break;
        default:
          break;
      }
    });

    return socket;
  }

  function makeSignalingServerConnection() {
    const socket = new WebSocket(signalingServer);

    let registerAs;

    socket.addEventListener('open', () => {
      if (registerAs) socket.send(registerAs);
    });

    socket.addEventListener('message', event => {

    });

    return {
      registerAs(id) {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(id);
        }
        else registerAs = id;
      }
    }
  }
}