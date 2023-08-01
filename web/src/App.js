import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import {
  BrowserRouter,
  Route,
  Routes
} from 'react-router-dom';
import Menu from './Screens/Menu';
import E404 from './Screens/E404';
import NewPlayer from './Screens/NewPlayer';
import Lobby from './Screens/Lobby/Lobby';
import Game from './Screens/Game/Game';
import { SocketContext } from './SocketContext';
import { io } from 'socket.io-client';

function App() {
  const [socket, setSocket] = useState(null);

  const performSocketConnection = () => {
    const token = localStorage.getItem('PLAYER_TOKEN');
  
    setSocket(io('192.168.100.8:9000', {
      auth: {
        token
      }
    }));

  }

  useEffect(() => {
    if(socket !== null) {
      socket.on('disconnect', () => {
        if(window.navigator.onLine) {
          performSocketConnection();
        }
      });
    }
  }, [socket]);

  useEffect(() => {
    if('PLAYER_TOKEN' in localStorage) {
      performSocketConnection();
    }

    window.ononline = () => {
      performSocketConnection();
    }
    window.onoffline = () => {
        alert('Unavailable network');
    }
  }, []);

  return (
    <SocketContext.Provider value={{
      performSocketConnection,
      socket
    }}>
      <BrowserRouter>
        <Routes>

          <Route path='/menu' Component={Menu} />
          <Route path='/' Component={NewPlayer}/>
          <Route path='/lobby/:room' Component={Lobby} />
          <Route path='/game' Component={Game} />
          <Route path='*' Component={E404} />

        </Routes>
      </BrowserRouter>
    </SocketContext.Provider>
  );
}

export default App;