import { useContext, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from 'axios';
import { TransitionGroup, CSSTransition } from 'react-transition-group'
import Header from "../../Fragments/Header/Header";
import './Lobby.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faStar as faSolidStar,
    faShare,
    faXmark
} from '@fortawesome/free-solid-svg-icons';
import {
    faStar as faRegularStar,
} from '@fortawesome/free-regular-svg-icons';
import { SocketContext } from '../../SocketContext';
import TooltipArea  from '../../Fragments/Tooltip/Tooltip';
import ChoiceChips from '../../Fragments/ChoiceChips/ChoiceChips';
import Toggle from "../../Fragments/Toggle/Toggle";
import Chat from "../../Fragments/Chat/Chat";

export default function Lobby() {
    const { room } = useParams();
    let [players, setPlayers] = useState(null);
    let [hostId, setHostId] = useState(null);
    let [currentPlayerId, setCurrentPlayerId] = useState(null);
    let [hostChanged, setHostChanged] = useState(false);
    let [roundDuration, setRoundDuration] = useState(null);
    let [category, setCategory] = useState(null);
    let [rounds, setRounds] = useState(null);
    let [categories, setCategories] = useState([]);
    const [publicRoom, setPublicRoom] = useState(false);
    const [maxPlayers, setMaxPlayers] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    const { socket } = useContext(SocketContext);
    const navigate = useNavigate();

    useEffect(() => {
        setCurrentPlayerId(localStorage.getItem('PLAYER_UUID'));
    }, []);

    useEffect(() => {
        if(socket !== null) {
            manageEvents();
        }
    }, [socket]);

    // useEffect(() => {
    //     if(hostId !== null && hostChanged && hostId === currentPlayerId) {
    //         alert('You are the host now');
    //         setHostChanged(false);
    //     }
    // }, [hostId, hostChanged]);

    const setError = (error) => {
        setErrorMessage(error);
    }

    const manageEvents = () => {
        socket.emit(
            'join', 
            room, 
            localStorage.getItem('PLAYER_NICKNAME'),
            localStorage.getItem('PLAYER_AVATAR')
        );

        socket.emit('requestCategories');

        socket.on('inAnotherRoom', () => setError('You are in another room'));

        socket.on('getCategories', _categories => setCategories(_categories));

        socket.on('joined', (_players, _roundDuration, _category, _rounds, _publicRoom, _maxPlayers) => {
            setErrorMessage('');
            setPlayers(managePlayers(_players));
            setRoundDuration(_roundDuration);
            setCategory(_category);
            setRounds(_rounds);
            setPublicRoom(_publicRoom);
            setMaxPlayers(_maxPlayers);
        });

        socket.on('roomNotExists', () => setError('This room does not exists'));

        socket.on('left', _players => {
            setPlayers(managePlayers(_players));
        });

        socket.on('changedHost', _players => {
            setPlayers(managePlayers(_players));
            setHostChanged(true);
        });

        socket.on('changedRoundDuration', _roundDuration => setRoundDuration(_roundDuration));

        socket.on('changedCategory', _category => setCategory(_category));

        socket.on('changedRounds', _rounds => setRounds(_rounds));

        socket.on('changedPublicRoom', _publicRoom => setPublicRoom(_publicRoom));

        socket.on('changeMaxPlayers', _maxPlayers => setMaxPlayers(_maxPlayers));

        socket.once('gameStarted', () => navigate('/game'));

        socket.once('removed', () => navigate('/menu'));

        socket.on('maxPlayersReached', () => setError('Max players reached'));
    }

    const managePlayers = (players) => {
        const noHost = players.filter(x => !x.isHost);
        const host = players.filter(x => x.isHost);

        if(host.length > 0) {
            setHostId(host[0].id);
        }

        return host.concat(noHost);
    }

    const changeHost = (newHostId) => {
        socket.emit(
            'changeHost',
            room,
            newHostId
        );
    }

    const copyToClipboard = () => {
        // navigator.clipboard.writeText('hola').then(res => {
        //     alert('Copied')
        // }, () => {
        //     alert('Error to copy to clipboard');
        // })
    }

    const onChangeChoiceChips = (value,id) => {
        switch(id) {
            case 'ROUND_DURATION': {
                socket.emit(
                    'changeRoundDuration',
                    room,
                    value
                );
                setRoundDuration(value);
                break;
            }
            
            case 'CATEGORY': {
                socket.emit(
                    'changeCategory',
                    room,
                    value
                );
                setCategory(value);
                break;
            }

            case 'ROUNDS': {
                socket.emit(
                    'changeRounds',
                    room,
                    value
                );
                setRounds(value);
                break;
            }
            
            case 'MAX_PLAYERS': {
                socket.emit(
                    'changeMaxPlayers',
                    room,
                    value
                );
                setMaxPlayers(value);
                break;
            }
        }
    }

    const startGame = () => {
        socket.emit('startGame', room);
    }

    const onClickToggle = id => {
        switch(id) {
            case 'TOGGLE_PUBLIC_ROOM': {
                socket.emit('changePublicRoom', room, !publicRoom);
                setPublicRoom(!publicRoom);
                break;
            }
        }
    }

    const removePlayer = player => {
        socket.emit('removeFromRoom', room, player);
    }

    if(errorMessage !== null) {
        if(errorMessage.length === 0) {
            return <div className="lobby">
                <Header />
                <Chat socket={socket} room={room} />
                <div className="container">
                <br/>
                <p className="room-name">Room: {room} &nbsp;
                    <TooltipArea wrapperClasses='inline' touchableClasses='icon' text='Share' textOnClick='Copied to clipboard' onClick={copyToClipboard} >
                        <FontAwesomeIcon icon={faShare} />
                    </TooltipArea>
                </p>
                <br/>
                <hr/>
                <br/>
                <h2>Players</h2>
                <br/>
                    {
                        players !== null && <TransitionGroup className='group-players'>
                            {
                                players.map((item, index) => {
                                    return <CSSTransition appear key={item.id} timeout={300} classNames="item" unmountOnExit>
                                    <div className="player-card">
                                        <div className="avatar">{item.avatar}</div>
                                        <div className="nickname">
                                            <p>{item.nickname}</p>
                                        </div>
                                        <div className="admin-player-options">
                                            {
                                                item.isHost ? 

                                                <div className="icon">
                                                    <FontAwesomeIcon icon={faSolidStar} size="xl" />
                                                </div>
                                                :
                                                (
                                                    hostId === currentPlayerId && <>
                                                        <TooltipArea wrapperClasses='inline' touchableClasses='icon' text='Ban player' onClick={() => removePlayer(item.id)}>
                                                            <FontAwesomeIcon icon={faXmark} size="2xl" />
                                                        </TooltipArea>

                                                        <TooltipArea wrapperClasses='inline' touchableClasses='icon' text='Set as admin' onClick={() => changeHost(item.id)}>
                                                            <FontAwesomeIcon icon={faRegularStar} size="xl" />
                                                        </TooltipArea>
                                                    </>
                                                )
                                            }
                                        </div>
                                    </div>
                                    </CSSTransition>
                                })
                            }
                        </TransitionGroup>
                    }
                    <br/>
                    <div className="options">
                        <hr/>
                        <br/>
                        <div>
                            <h2 className="inline">Options &nbsp;</h2>
                            {
                                hostId !== currentPlayerId && <p className="title-details inline">(Only admin can change this)</p>
                            }
                        </div>
                        <br/>
                        <p>Open room to public: </p>
                        <br/>
                        <Toggle onClick={onClickToggle} id='TOGGLE_PUBLIC_ROOM' selected={publicRoom} disabled={hostId !== currentPlayerId} />
                        <br/>
                        <p>Max of players: </p>
                        <br/>
                        <ChoiceChips id="MAX_PLAYERS" onChange={onChangeChoiceChips} values={[2,5,10,15,20]} value={maxPlayers} disabled={hostId !== currentPlayerId} />
                        <br/>
                        <p>Round duration (min): </p>
                        <br/>
                        <ChoiceChips id="ROUND_DURATION" onChange={onChangeChoiceChips} values={[1,2,3,4,5]} value={roundDuration} disabled={hostId !== currentPlayerId} />
                        <br/>
                        <p>Rounds: </p>
                        <br/>
                        <ChoiceChips id="ROUNDS" onChange={onChangeChoiceChips} values={[1,2,3,4,5,6,7,8,9,10]} value={rounds} disabled={hostId !== currentPlayerId} />
                        <br/>
                        <p>Category: </p>
                        <br/>
                        <ChoiceChips id="CATEGORY" onChange={onChangeChoiceChips} values={categories} value={category} disabled={hostId !== currentPlayerId} />
                        <br/>
                    </div>
                    {
                        hostId === currentPlayerId ? <button className="button-1" onClick={startGame}>Play</button> : <h2 className="text-center">Waiting for the host to start game</h2>
                    }
                    <br/>
                    <br/>
                </div>
            </div>
        } else {
            return <div>
                <h1>{errorMessage}</h1>
            </div>
        }
    } else {
        return null;
    }
}