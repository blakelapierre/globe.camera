import signalServerConnection from './signalServerConnection';

const mapServer = 'ws://localhost:8888?broadcaster',
      signalingServer = 'wss://p2p.ninja/signaler?broadcaster';

export {becomeBroadcaster};

function becomeBroadcaster(registeredCallback) {
  const inSignal = signalServerConnection({
                   'signal': {
                     'connection-state': status => console.log('connection-state', status),
                     'partner-message': ([partner, message]) => console.log('partner-message', partner, message),
                   },
                   'peer': {
                     'connection': peerConnection => {
                        mapServerSocket.send(JSON.stringify(['NEW_STREAM']));

                        peerConnection.addEventListener('connection', event => {
                          console.log('broadcaster peer open', peerConnection);
                        });
                     }
                   }
                 }),
        outSignal = signalServerConnection({
                   'signal': {
                     'connection-state': status => console.log('connection-state', status),
                     'partner-message': ([partner, message]) => console.log('partner-message', partner, message),
                   },
                   'peer': {
                     'connection': peerConnection => {
                        mapServerSocket.send(JSON.stringify(['NEW_STREAM']));

                        peerConnection.addEventListener('connection', event => {
                          console.log('broadcaster peer open', peerConnection);
                        });
                     }
                   }
                 }),
        mapServerSocket = makeMapServerConnection(id => {
                            inSignal.registerAs(id);
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

  // function makeSignalingServerConnection() {
  //   const socket = new WebSocket(signalingServer);

  //   let registerAs;

  //   socket.addEventListener('open', () => {
  //     if (registerAs) socket.send(registerAs);
  //   });

  //   socket.addEventListener('message', event => {

  //   });

  //   return {
  //     registerAs(id) {
  //       if (socket.readyState === WebSocket.OPEN) {
  //         socket.send(id);
  //       }
  //       else registerAs = id;
  //     }
  //   }
  // }
}