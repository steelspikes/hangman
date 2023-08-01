import React, { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faMessage as faMessageSolid,
    faPaperPlane as faPaperPlaneSolid,
    faXmark
} from '@fortawesome/free-solid-svg-icons';
import './Chat.css';

export default function Chat({
    socket,
    room
}) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const messagesBottom = useRef(null);
    const [currentPlayerId, setCurrentPlayerId] = useState(null);
    const [showPlaneAnimation, setShowPlaneAnimation] = useState(false);

    useEffect(() => {
        setCurrentPlayerId(localStorage.getItem('PLAYER_UUID'));
    }, []);

    useEffect(() => {
        if(socket !== null) {
            manageEvents();
        }
    }, [socket]);

    useEffect(() => {
        goToBottomMessage();
    }, [messages]);

    useEffect(() => {
        if(open) {
            setTimeout(() => {
                goToBottomMessage();
            }, 100);
        }
    }, [open]);

    const goToBottomMessage = () => {
        messagesBottom.current.scrollIntoView({
            behavior: 'smooth'
        });
    }

    const manageEvents = () => {
        socket.emit('requestMessages', room);
        socket.on('newMessages', _messages => setMessages(_messages));
    }

    const sendMessage = e => {
        e.preventDefault();
        socket.emit('sendMessage', room, message);
        setMessage('');
        setShowPlaneAnimation(true);
        setTimeout(() => {
            setShowPlaneAnimation(false);
        }, 200);
    }

    const onChangeMessage = e => setMessage(e.target.value);

    return <div className="chat-container">
        <div className={"chat-screen" + (open ? " open-chat" : " close-chat")}>
            <h1>Chat</h1>
            <div className="messages">
                {
                    messages.map(({
                        playerId,
                        message,
                        nickname
                    }) => <div className={"message" + (playerId === currentPlayerId ? ' owner-message' : ' others-message')}>
                        <p className="name">{nickname} {playerId === currentPlayerId && '(you)'}</p>
                        <p className={"message" + (playerId === currentPlayerId ? ' owner-message-body' : ' others-message-body')}>{message}</p>
                    </div>)
                }
                <div ref={messagesBottom}></div>
            </div>
            <form className="controls" onSubmit={sendMessage}>
                <input value={message} onChange={onChangeMessage} type="text" placeholder="Message" />
                <button type="submit">
                    <FontAwesomeIcon className={"plane-icon" + (showPlaneAnimation ? " show-plane-animation" : "")} icon={faPaperPlaneSolid} />
                </button>
            </form>
        </div>

        <button onClick={() => setOpen(!open)} className={"floating-chat-button" + (open ? " floating-chat-button-open" : " floating-chat-button-close")}>
            {
                open 
                ? 
                <FontAwesomeIcon icon={faXmark} />
                :
                <FontAwesomeIcon icon={faMessageSolid} />
            }
        </button>
    </div>
}