import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useContext, useEffect, useState } from 'react';
import { SocketContext } from '../SocketContext';

export default function Menu() {
    const navigate = useNavigate();
    const [availableRooms, setAvailableRooms] = useState([]);
    const [inGame, setInGame] = useState(false);
    const { socket } = useContext(SocketContext);

    useEffect(() => {
        // getAvailableRooms();
    }, []);

    useEffect(() => {
        if(socket !== null) {
            manageSocketEvents();
        }
    }, [socket]);

    const manageSocketEvents = () => {
        socket.emit('requestPublicRooms');
        socket.emit('requestIsInGame');
        socket.emit('requestLeaveCurrentRoom');

        socket.once('roomCreated', room => navigate('/lobby/'+room));
        socket.on('isInGame', () => setInGame(true));
        socket.on('publicRoomsChanged', rooms => setAvailableRooms(rooms));
    }

    const requestRoom = async () => {
        socket.emit('createRoom');
    }

    return <div>
        <h1>Menu</h1>
        <button onClick={requestRoom}>Create room</button>
        {
            inGame && <div>
                <h1>Current room</h1>
                <Link to='/game'>Go to current game</Link>
            </div>
        } 

        <h1>Available rooms</h1>
        <ul>
        {
            availableRooms.map(({roomId, players, maxPlayers}) => <li><Link to={'/lobby/'+roomId}>
                <div>
                    <p>Room {roomId}</p>
                    <p>Players: {players}/{maxPlayers}</p>
                </div>    
            </Link></li>)
        }
        </ul>
    </div>
}