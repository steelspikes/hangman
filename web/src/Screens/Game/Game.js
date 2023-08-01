import React, { useContext, useEffect, useState } from 'react';
import Header from '../../Fragments/Header/Header';
import './Game.css';
import { SocketContext } from '../../SocketContext';
import { useNavigate, useParams } from 'react-router-dom';
import ScreenModal from '../../Fragments/ScreenModal/ScreenModal';
import HangmanDraw from '../../Fragments/HangmanDraw/HangmanDraw';

const keyboardLetters = [...Array(26).keys()].map(x => String.fromCharCode(x + 65));

export default function Game() {
    const { socket } = useContext(SocketContext);
    const [time, setTime] = useState(null);
    const [showWaitingPlayers, setShowWaitingPlayers] = useState(false);
    const [showCountdown, setShowCountdown] = useState(false);
    const [countdownValue, setCountDownValue] = useState(0);
    const [round, setRound] = useState(0);
    const [word, setWord] = useState('');
    const [mistakes, setMistakes] = useState(0);
    const [errorMessage, setErrorMessage] = useState(null);
    const [players, setPlayers] = useState([
        {nickname: 'pepe23'},
        {nickname: 'juan29'},
        {nickname: 'sonrr'},
        {nickname: 'heyhey24'},
        {nickname: 'canela'},
        {nickname: 'osiosi89'}
    ]);

    const navigate = useNavigate();

    useEffect(() => {
        if(socket !== null) {
            manageEvents();
        }
    }, [socket]);

    const sayWaitingPlayers = (show) => {
        setErrorMessage('');
        if(show) {
            setShowWaitingPlayers(true);
        } else {
            setShowWaitingPlayers(false);
        }
    }

    const sayCountdown = (value) => {
        setCountDownValue(value);
        setShowCountdown(value > 0);
    }

    const manageEvents = () => {
        socket.emit('joinGame');

        socket.on('reconnected', () => setErrorMessage(''));
        socket.on('everyoneInGame', () => sayWaitingPlayers(false));
        socket.on('timerChanged', time => setTime(time));
        socket.on('countdown', countdown => sayCountdown(countdown));
        socket.on('roundChanged', round => setRound(round));
        socket.on('sendWord', word => setWord(word));
        socket.on('guessedWord', word => setWord(word));
        socket.on('mistake', mistakes => setMistakes(mistakes));
        socket.on('notInAGame', () => setErrorMessage("You are not in a game"));
        // socket.on('notInAGame', () => setErrorMessage(""));
    }

    const parseTime = (d) => {
        d = Number(d);

        var m = Math.floor(d % 3600 / 60);
        var s = Math.floor(d % 3600 % 60);
    
        return ('0' + m).slice(-2) + ":" + ('0' + s).slice(-2);
    }

    const onClickLetter = (letter) => {
        socket.emit('guessLetter', round, letter);
    }

    const leaveGame = () => {
        socket.emit('leaveCurrentGame');
        navigate('/');
    }

    if(errorMessage !== null) {
        if(errorMessage.length === 0) {
            return <div className='game'>
                <ScreenModal show={showWaitingPlayers}>
                    <h1>Waiting players</h1>
                </ScreenModal>

                <ScreenModal show={showCountdown}>
                    <h1>Round {round}</h1>
                    <h1>Countdown</h1>
                    <h1>{countdownValue}</h1>
                </ScreenModal>
                <div className='players'>
                    <h1>Players</h1>
                    {
                        players.map(x => <div className='player'>
                            <div className='left'>
                                <div className='avatar'>
                                    23
                                </div>
                            </div>
                            <div className='right'>
                                <b>{x.nickname}</b>
                                <p>Letters: 2/10</p>
                                <p>Mistakes: 9</p>
                            </div>
                        </div>)
                    }
                </div>

                {/* <div>
                    <h2>{parseTime(time)}</h2>
                    <h1>{word}</h1>
                    <h1>Mistakes {mistakes}</h1>
                    <button onClick={leaveGame}>Kick me out!</button>
                </div> */}

                <div className='content'>
                    <div className='draw'>
                        <HangmanDraw />
                    </div>
                    <div className='controls'>
                        
                        <div className='keyboard'>
                        {
                            keyboardLetters.map(letter => <button 
                                className='key' 
                                onClick={() => onClickLetter(letter)}
                            >
                                {letter}
                            </button>)
                        }
                        </div>
                    </div>
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