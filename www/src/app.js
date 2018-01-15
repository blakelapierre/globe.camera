import { h, render } from 'preact-cycle';


const App = ({}) => (
  <app>
    <Messages />
    <Map />
    <Donate />
  </app>
);

const Messages = ({}) => (
  <messages>
    Messages
  </messages>
);

const Map = ({}) => (
  <map>
    Map
  </map>
);

const Donate = ({}) => (
  <donate>
    Donate
  </donate>
);

render(
  App, {}, document.body
);