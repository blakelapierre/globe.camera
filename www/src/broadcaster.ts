const mapServer = 'ws://localhost:8888';

export {becomeBroadcaster};

function becomeBroadcaster(registeredCallback) {
  const socket = new WebSocket(mapServer);

  socket.addEventListener('open', () => {
    socket.send(JSON.stringify(['REGISTER_AS_BROADCASTER']));
  });

  socket.addEventListener('message', event => {
    const [type, message] = JSON.parse(event.data);

    switch (type) {
      case 'REGISTERED_AS_BROADCASTER':
        const {id} = message;
        registeredCallback(id);
        break;
      default:
        break;
    }
  });
}