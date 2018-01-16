const WebSocket = require('ws');

// console.log(WebSocket);

const port = 8888;

const server = new WebSocket.Server({port});

server.on('connection', socket => {
  socket.on('message', data => {
    console.log(data);
  });
});


setInterval(
  () => {
    const id = `id${Math.round(Math.random() * 10000)}`,
          image = 'https://lh3.googleusercontent.com/ToVUX_8CXB9n8YfJb5b44O9UwgZu0b0Ch1s2ld4t7jSJE2rSP2Z3orSkuYeNtBHRfZewhm7wnA=w640-h400-e365',
          location = [Math.random() * 180 - 90, Math.random() * 360 - 180],
          color = `rgba(${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)}, 1)`;

    server.clients.forEach(socket => socket.send(JSON.stringify(['NEW_STREAM', {id, image, location, color}]), error => error ? console.error('send error', error) : undefined));
  }, 1000);