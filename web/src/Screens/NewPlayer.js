import React, { useContext, useEffect, useState } from "react";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { SocketContext } from '../SocketContext';

export default function Main() {
    const [nickname, setNickname] = useState("");
    const [avatar, setAvatar] = useState("");

    const { performSocketConnection } = useContext(SocketContext);
    const navigate = useNavigate();

    useEffect(() => {
        if('PLAYER_TOKEN' in localStorage) {
            navigate('/menu');
        }
    }, []);

    const requestToken = async (e) => {
        e.preventDefault();
        
        if(nickname.length === 0) {
            alert('Write a nicknickname');
            return;
        }

        if(avatar.length === 0) {
            alert('Choose an avatar');
            return;
        }
        
        const res = await axios.post("http://localhost:9000/token/generate");

        if(res.status === 200) {
            localStorage.setItem('PLAYER_TOKEN', res.data.token);
            localStorage.setItem('PLAYER_NICKNAME', nickname);
            localStorage.setItem('PLAYER_AVATAR', avatar);
            localStorage.setItem('PLAYER_UUID', res.data.playerUUID);

            performSocketConnection();

            navigate('/menu');
        }
    }

    return (
        <form onSubmit={requestToken} className="flex-center-middle">
            <h1>Hangman</h1>
            <h2>Hello!, new player.</h2>
            <p>To continue, create your personality</p>
            <br/>
            <input 
                placeholder="Your nickname" 
                onChange={e => setNickname(e.target.value)} 
                value={nickname}
            />
            <input 
                placeholder="Avatar id" 
                onChange={e => setAvatar(e.target.value)}
                value={avatar} 
            />
            <br/>
            <input type="submit" />
        </form>
    )
}