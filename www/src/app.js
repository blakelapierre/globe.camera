import { h, render } from 'preact-cycle';

const {
  INIT_APP,
  INIT_MAP_CANVAS,
  LOAD_STREAM,
  MAP_CANVAS_CLICK,
  SHARE_CAMERA,
  NEW_STREAM,
  PLOT_STREAM
} = {
  INIT_APP: (_, mutation, element) => {
    if (!_.init.app) {
      console.log('init app');

      _.mapServer = connectToMapServer(mutation);
      _.signaler = connectToSignaler(mutation);

      // attachStreamSim(mutation);

      _.init.app = true;
    }
  },
  INIT_MAP_CANVAS: (_, canvas) => {
    if (!_.init.mapCanvas) {
      console.log('init canvas map');

      _.mapCanvas = canvas;
      _.mapCanvas2dContext = canvas.getContext('2d');
      _.mapCanvas2dContext.fillStyle = '#f00';
      _.mapCanvas2dContext.webkitImageSmoothingEnabled = false;
      _.mapCanvas2dContext.mozImageSmoothingEnabled = false;
      _.mapCanvas2dContext.imageSmoothingEnabled = false;
      _.mapCanvas2dContext.globalCompositeOperation = 'multiply';

      _.init.mapCanvas = true;
    }
  },

  LOAD_STREAM: (_, id, event) => {
    _.state = 'watch-stream';
    _.stream.id = id;
    // connectToStream(id);
  },

  MAP_CANVAS_CLICK: (_, event) => {
    console.log('click', event);

    _.mapCanvas2dContext.fillRect(event.offsetX / event.target.clientWidth * event.target.width, event.offsetY / event.target.clientHeight * event.target.height, 1, 1);
  },

  SHARE_CAMERA: (_, mutation, event) => {
    navigator
      .mediaDevices
      .getUserMedia({audio: true, video: true})
      .then(stream => {
        mutation(_ => {
          _.video = window.URL.createObjectURL(stream);
          return _
        })();
      })
      .catch(error => {
        mutation(_ => {
          _.messages.push({message: 'Error getting camera'});
          return _;
        })();
      });

    _.mapServer.SHARE_CAMERA();

    return _;
  },

  NEW_STREAM: (_, mutation, stream) => {
    _.streams.latest.unshift(stream);

    if (_.streams.latest.length >= 20) _.streams.latest.pop();

    mutation(PLOT_STREAM)([stream.location[0], stream.location[1], stream.color]);
  },

  PLOT_STREAM: ({mapCanvas2dContext, map: {size: {width, height}}}, [latitude, longitude, color]) => {
    mapCanvas2dContext.fillStyle = color;
    mapCanvas2dContext.fillRect(Math.round((latitude + 90) / 180 * width), Math.round((longitude + 180) / 360 * height), 1, 1);
  }
};

const App = ({map, messages, streams: {latest, mostWatched}, video}, {mutation}) => (
  <app ref={mutation(INIT_APP, mutation)}>
    {messages.length > 0 ? <Messages messages={messages}/> : undefined}
    <display-area>
      {latest.length > 0 ? <StreamList title="latest" streams={latest} /> : undefined}
      <Map map={map}/>
      {mostWatched.length > 0 ? <StreamList title="most watched" streams={mostWatched} /> : undefined}
    </display-area>
    {video ? <Video video={video} /> : undefined}
    <Donate />
  </app>
);

const Video = ({video}) => (
  <video src={video} />
);

const Messages = ({messages}) => (
  <messages>
    {messages.map(({message}) => <Message message={message} />)}
  </messages>
);

const Message = ({message}) => (
  <message>{message}</message>
);

const StreamList = ({streams, title}) => (
  <stream-list>
    <span>{title}</span>
    <streams>
      {streams.map(({id, image}) => <Stream id={id} image={image} />)}
    </streams>
  </stream-list>
);

const Stream = ({id, image}, {mutation}) => (
  <stream onClick={mutation(LOAD_STREAM, id)}>
    <img src={image} />
    <id>{id}</id>
  </stream>
);

const Map = ({map:{size:{width, height}}}, {mutation}) => (
  <map>
    <canvas width={width} height={height} ref={mutation(INIT_MAP_CANVAS)} onClick={mutation(MAP_CANVAS_CLICK)}></canvas>
  </map>
);

const Donate = ({}, {mutation}) => (
  <donate>
    <button>Donate</button>
    <button onClick={mutation(SHARE_CAMERA, mutation)}>Share Camera View</button>
  </donate>
);

render(
  App, {
    init: {},
    state: 'main',
    map:{ size: {width: 240, height: 240 / Math.PI}},
    streams: {latest:[], mostWatched: []},
    messages: [{message: 'welcome to globe.camera!'}]
  }, document.body
);

let mapRetries = 0;
function connectToMapServer(mutation) {
  const socket = new WebSocket('ws://localhost:8888');

  socket.addEventListener('open', () => {
    mapRetries = 0;
    console.log('connected to map server!');
  });

  socket.addEventListener('close', () => {
    setTimeout(() => connectToMapServer(mutation), Math.pow(2, mapRetries) * 500);
    mapRetries++;
  });

  socket.addEventListener('message', event => {
    const [type, message] = JSON.parse(event.data);

    switch (type) {
      case 'NEW_STREAM':
        const {id, image, location, color} = message;
        mutation(NEW_STREAM, mutation)({id, image, location, color});
        break;
      case 'SHARE_CAMERA':
        const {broadcast, sender} = message;

        mutation(_ => {
          _.signaler.register(sender.data);
          _.signaler.connectTo(broadcast.in.data);
        })();

        console.log('share_camera', broadcast, sender);
      default:
        break;
    }
  });

  return {
    SHARE_CAMERA() {
      socket.send(JSON.stringify(['SHARE_CAMERA']));
    }
  }
}

let signalerRetries = 0,
    id = new Uint8Array(64);

window.crypto.getRandomValues(id);

function connectToSignaler(mutation) {
  const socket = new WebSocket('wss://p2p.ninja/signaler');

  socket.addEventListener('open', () => {
    signalerRetries = 0;
    // socket.send(id);
    console.log('connected to signaler server!');
  });

  socket.addEventListener('close', () => {
    setTimeout(() => connectToSignaler(mutation), Math.pow(2, signalerRetries) * 500);
    signalerRetries++;
  });

  socket.addEventListener('message', event => {
    console.log('signaler', event);
  });

  return {
    register(id) {
      socket.send(new Uint8Array(id));
    },

    connectTo(id) {
      socket.send(new Uint8Array(id));
    }
  }
}

function attachStreamSim(mutation) {
  setInterval(
    mutation(({map:{size:{height, width}}, mapCanvas2dContext}) => {
      const id = `id${Math.round(Math.random() * 10000)}`,
            image = 'https://lh3.googleusercontent.com/ToVUX_8CXB9n8YfJb5b44O9UwgZu0b0Ch1s2ld4t7jSJE2rSP2Z3orSkuYeNtBHRfZewhm7wnA=w640-h400-e365',
            location = [Math.random() * 180 - 90, Math.random() * 360 - 180],
            color = `rgba(${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)}, ${Math.round(Math.random() * 255)}, 1)`;
      mutation(NEW_STREAM, mutation)({id, image, location, color});
      // mapCanvas2dContext.fillRect(Math.round(Math.random() * width), Math.round(Math.random() * height), 1, 1);
    }), 1000);
}