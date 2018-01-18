import {randomBytes} from 'crypto';

const WebSocket = require('ws');

// console.log(WebSocket);

const port = 8888;

const server = new WebSocket.Server({port});

const state = {
  broadcasters: [],
  availableBroadcasters: []
};

function remove(item, array) {
  const index = array.indexOf(item);

  if (index > -1) array.splice(index, 1);
}

server.on('connection', socket => {
  socket.on('close', () => {
    if (socket.broadcaster) {
      remove(socket.broadcaster, state.broadcasters);
      remove(socket.broadcaster, state.availableBroadcasters);

      console.log(`Lost broadcaster: ${socket.broadcaster.id.toString('hex')}`);
    }
  });

  socket.on('message', data => {
    const [type, message] = JSON.parse(data);

    switch (type) {
      case 'SHARE_CAMERA':
        const broadcast = {id: randomBytes(64), in: randomBytes(64), out: randomBytes(64)},
              sender = randomBytes(64);

        try {
          const broadcaster = createBroadcaster(broadcast, sender);

          socket.send(JSON.stringify(['SHARE_CAMERA', {broadcast, sender}]), error => error ? console.error('SHARE_CAMERA send error', error) : undefined);
        }
        catch (error) {
          console.log('SHARE_CAMERA bytes generation error', error);
          socket.send(JSON.stringify(['SHARE_CAMERA_ERROR']), error => error ? console.error('SHARE_CAMERA_ERROR send error', error) : undefined);
        }

      case 'REGISTER_AS_BROADCASTER':
        const broadcaster = {id: randomBytes(64), socket, assignedBroadcasts: []};

        state.broadcasters.push(broadcaster);
        state.availableBroadcasters.push(broadcaster);

        socket.broadcaster = broadcaster;

        // not sure we actually need to send the id here...
        socket.send(JSON.stringify(['REGISTERED_AS_BROADCASTER', {id: broadcaster.id}]), error => error ? console.error('REGISTERED_AS_BROADCASTER send error', error) : undefined);

        console.log(`New broadcaster: ${broadcaster.id.toString('hex')}`);
      default:
        break;
    }
  });
});

console.log('Now listening on', port);

generateFakeData();

function createBroadcaster(broadcast, sender) {
  const broadcaster = getBroadcaster();

  if (broadcaster) assignBroadcaster(broadcaster, broadcast, sender);
  else console.error('failed to create broadcaster!');

  function getBroadcaster() {
    if (state.availableBroadcasters.length > 0) return state.availableBroadcasters[0];

    console.error('no available broadcasters!');
  }

  function assignBroadcaster(broadcaster, broadcast, sender) {
    if (broadcaster.socket.readyState === WebSocket.OPEN) {
      broadcaster.socket.send(JSON.stringify(['NEW_STREAM', {broadcast, sender}]), error => error ? console.error('NEW_STREAM send error', error) : undefined);
      broadcaster.assignedBroadcasts.push({broadcast, sender});
    }
    else {
      console.error('error assigning broadcaster (readyState not open)');
    }
  }
}

function generateFakeData() {
  setInterval(
    () => {
      const id = `id${Math.round(Math.random() * 10000)}`,
            image = 'https://lh3.googleusercontent.com/ToVUX_8CXB9n8YfJb5b44O9UwgZu0b0Ch1s2ld4t7jSJE2rSP2Z3orSkuYeNtBHRfZewhm7wnA=w640-h400-e365',
            location = [Math.random() * 180 - 90, Math.random() * 360 - 180],
            color = `rgba(${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)}, 1)`;

      server.clients.forEach(socket => socket.send(JSON.stringify(['NEW_STREAM', {id, image, location, color}]), error => error ? console.error('send error', error) : undefined));
    }, 1000);
}