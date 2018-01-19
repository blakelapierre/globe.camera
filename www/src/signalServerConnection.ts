// function updateState(state) {
//   for (let partner in peerConnections) sendState(partner, state);
// }

// function sendState(partner, state) {
//   const {dataChannel} = peerConnections[partner];
//   try {
//     dataChannel.send(stringifyState(state));
//   }
//   catch (e) {
//     console.log(`Error sending to ${partner}`, e);
//   }
// }
const RTCPeerConnection = (<any>window).RTCPeerConnection || (<any>window).webkitRTCPeerConnection || (<any>window).mozRTCPeerConnection;

const SIGNALER_IP = 'localhost', //'192.168.0.105',
      SIGNALER_PORT = 443,
      HOST = 'p2p.ninja', // HOST = window.location.host; //`${SIGNALER_IP}:${SIGNALER_PORT}`; //8080;
      SIGNALER_URL = 'wss://p2p.ninja/signaler?broadcaster';

/*
actions:
  set-signaler-status,
  chat-channel,
  partner-message
*/
export default function connectToSignaler(actions) {
  if (WebSocket && window.crypto) {
    console.log('connecting to signaler');
    const socket = new WebSocket(SIGNALER_URL),
          state = {id: undefined};

    return handle(socket, state, actions);
  }

  throw Error('WebSocket or window.crypto not supported!');
}

const peerConnections = {};

function handle(socket, state, actions) {
  const queue = [];

  let partner, readingPartner = false;

  socket.addEventListener('open', event => {
    actions['signal']['connection-state']('connected');

    if (state.registerAs) {
      socket.send(state.registerAs);
      delete state.registerAs;
    }
  });

  function processQueue() {
    queue.forEach(message => {
      processPartnerMessage(partner, message);
    });

    queue.splice(0);
  }

  socket.addEventListener('message', event => {
    console.log(event);
    const {data} = event;
    if (data instanceof Blob) {
      readingPartner = true;
      const reader = new FileReader();
      reader.addEventListener('load', () => {partner = new Uint8Array(reader.result);readingPartner = false; processQueue();});
      reader.readAsArrayBuffer(data);
    }
    else if (data !== '') {
      queue.push(data);

      if (!readingPartner) processQueue();
    }
  });

  socket.addEventListener('close', () => {
    actions['signal']['connection-state']('Not Connected');

    setTimeout(() => connectToSignaler(actions), 5000);
  });

  return {registerAs, connectTo};

  function registerAs(id) {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(id);
      state.id = id;
    }
    else state.registerAs = id;
  }

  function connectTo(partner, setupFn) {
    return new Promise<any>((resolve, reject) => {
      socket.send(partner);

      let peerConnection = new RTCPeerConnection({
        iceServers: [
          {urls: 'stun:stun.stunprotocol.org'}
        ],
        iceTransports: 'all'
      });

      const data = {connection: peerConnection};
      peerConnections[partner.join(',')] = data;

      setupFn(peerConnection);

      peerConnection
        .createOffer(
          offer => peerConnection.setLocalDescription(offer).then(() => socket.send(JSON.stringify(offer))),
          error => console.log('error', error));

      peerConnection.addEventListener('icecandidate', ({candidate}) => {
        if (candidate) {
          socket.send(JSON.stringify(candidate));
        }
      });

      actions['peer']['connection'](peerConnection);

      resolve(peerConnection);
    });
  }

  // function connectTo(partner, programs, actions) {
  //   socket.send(partner);

  //   let peerConnection = new RTCPeerConnection({
  //     iceServers: [
  //       {urls: 'stun:stun.stunprotocol.org'}
  //     ],
  //     iceTransports: 'all'
  //   });

  //   const data = {connection: peerConnection};
  //   peerConnections[partner.join(',')] = data;

  //   peerConnection
  //     .createOffer(
  //       offer => peerConnection.setLocalDescription(offer).then(() => socket.send(JSON.stringify(offer))),
  //       error => console.log('error', error));

  //   actions['peer']['connection'](peerConnection);

  //   peerConnection.addEventListener('icecandidate', ({candidate}) => {
  //     if (candidate) {
  //       socket.send(JSON.stringify(candidate));
  //     }
  //   });
  // }

  function processPartnerMessage(partner, data) {
    if (!partner) throw new Error(`Protocol error! No Partner! ${partner}, ${JSON.stringify(data)}`);

    const message = JSON.parse(data);

    actions['signal']['partner-message']([partner, message]);

    switch (message.type) {
      case 'offer': receiveOffer(partner, message); break;
      case 'answer': receiveAnswer(partner, message); break;
      default: receiveCandidate(partner, message); break;
    }

    console.log(`Message from ${partner.join(',')}: ${data}`);
  }

  function receiveOffer(partner, message) {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        {urls: 'stun:stun.stunprotocol.org'}
      ],
      iceTransports: 'all'
    });

    peerConnections[partner] = {connection: peerConnection, partner};

    peerConnection
      .setRemoteDescription(message)
      .then(() =>
            peerConnection
            .createAnswer()
            .then(answer => {
              peerConnection.setLocalDescription(answer);
              socket.send(partner);
              socket.send(JSON.stringify(answer));
            })
           )
      .catch(error => console.log(error));

    peerConnection.addEventListener('icecandidate', ({candidate}) => {
      if (candidate) {
        if (!readingPartner) socket.send(partner);
        socket.send(JSON.stringify(candidate));
      }
    });

    actions['peer']['connection'](peerConnection);
  }

  function receiveAnswer(partner, message) {
    const {connection} = peerConnections[partner];
    connection.setRemoteDescription(message);
  }

  function receiveCandidate(partner, candidate) {
    const {connection} = peerConnections[partner];
    connection.addIceCandidate(candidate);
  }
}

function stringifyState(state) {
  return JSON.stringify(state, (k, v) => {
    if (v instanceof Uint8Array) {
      return (<any>Array).from(v);
    }
    return v;
  });
}