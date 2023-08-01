const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const uuid = require('uuid');

const app = express();

const ALLOWED_ORIGIN = 'http://192.168.100.8:3000';
const ALLOWED_METHODS = ['GET', 'POST'];
const SECRET = "kwx2kNNg4ShB@5a3J4ASFgiBDq1@80j@GT5CI5AbK786iC8BTxTdGOhqQUFInA2j";

app.use(cors({
    origin: ALLOWED_ORIGIN,
    methods: ALLOWED_METHODS
}));

app.use(bodyParser.json());
app.set('json spaces', 2)

const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: ALLOWED_ORIGIN,
        methods: ALLOWED_METHODS
    }
});

const fs = require('fs');
const categories = JSON.parse(fs.readFileSync('words.json', 'utf-8'));

const port = 9000;

let rooms = {};
let currentRooms = {};

function decodeToken(token) {
    try {
        const decoded = jwt.verify(token, SECRET);
        return decoded;
    } catch(e) {
        if(e instanceof jwt.JsonWebTokenError) {
            return null
        }
    }
}

function randomString(length) {
    const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var result = '';
    for (var i = length; i > 0; --i) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

async function manageRoundCountdown(room) {
    return new Promise((res, rej) => {
        rooms[room].remainingSeconds = rooms[room].roundDuration * 60;
        io.to(room).emit('timerChanged', rooms[room].remainingSeconds);

        rooms[room].intervalObject = setInterval(() => {
            rooms[room].remainingSeconds--;
            io.to(room).emit('timerChanged', rooms[room].remainingSeconds);

            if(rooms[room].remainingSeconds === 0) {
                clearInterval(rooms[room].intervalObject);
                rooms[room].intervalObject = null;
                res();
            }
        }, 1000);
    });
}

function hideWord(word) {
    console.log(word)
    return word.replace(/[^0-9a-z ]/gi, '').replace(/[0-9a-z]/gi, '*');
}

async function manageRounds(room) {
    while(rooms[room].currentRound <= rooms[room].rounds) {
        io.to(room).emit('roundChanged', rooms[room].currentRound);
        await manageCountdown(room);
        console.log('End countdown');
        console.log('Start round');
        rooms[room].roundRunning = true;
        io.to(room).emit('sendWord', hideWord(rooms[room].games[rooms[room].currentRound - 1].word));
        await manageRoundCountdown(room);
        console.log('End round');
        rooms[room].currentRound++;
        rooms[room].roundRunning = false;
    }
}

function manageGameReconnect(room, socket, playerUUID) {
    console.log('Reconnect');
    socket.join(room);

    const round = rooms[room].currentRound;
    rooms[room].players[playerUUID].socketId = socket.id;

    socket.emit('roundChanged', round);

    socket.emit('reconnected');

    if(rooms[room].roundRunning) {
        //Round running
        socket.emit('sendWord', rooms[room].games[round - 1].players[playerUUID].word);
        socket.emit('timerChanged', rooms[room].remainingSeconds);
        socket.emit('mistake', rooms[room].games[round - 1].players[playerUUID].mistakes);
    } else {
        //Rounds not running
        socket.emit('countdown', rooms[room].currentCountDown);
    }
}

function manageCountdown(room) {
    return new Promise((res, rej) => {
        rooms[room].currentCountDown = 5;
        io.to(room).emit('countdown', rooms[room].currentCountDown);

        rooms[room].intervalObject = setInterval(() => {
            rooms[room].currentCountDown--;
            io.to(room).emit('countdown', rooms[room].currentCountDown);

            if(rooms[room].currentCountDown === 0) {
                clearInterval(rooms[room].intervalObject);
                rooms[room].intervalObject = null;
                res();
            } 
        }, 1000);
    });
}

function manageWords(room) {
    let indexes = [];
    const category = rooms[room].category;
    const words = categories[category];
    rooms[room].games = [];
    
    while(indexes.length < rooms[room].rounds) {
        const randomIndex = Math.floor(Math.random() * words.length);
        if(!indexes.includes(randomIndex)) {
            indexes.push(randomIndex);
        }
    }

    for(let i of indexes) {
        const players = {};
        const word = words[Number(i)].toUpperCase();

        for(let playerUUID of Object.keys(rooms[room].players)) {
            players[playerUUID] = {
                word: hideWord(word),
                mistakes: 0
            };
        }

        rooms[room].games.push({
            word,
            players
        });
    }
}

function getPublicRooms() {
    return Object.values(rooms)
        .filter(x => x.publicRoom)
        .map(x => ({
            roomId: x.roomId,
            players: Object.keys(x.players).length,
            maxPlayers: x.maxPlayers
        }));
}

function removePlayerFromRoom(room, playerUUID) {
    delete rooms[room].players[playerUUID];
    // if(Object.keys(rooms[room].players).length > 0) {
        // const firstPlayer = Object.keys(rooms[room].players)[0];
        // rooms[room].players[firstPlayer].isHost = true;
        // rooms[room].host = firstPlayer;
    // }
    io.to(room).emit('left', Object.values(rooms[room].players));
}

function requestCancelRoomElimination(room) {
    if(rooms[room].eliminationTimeoutObject !== null) {
        clearTimeout(rooms[room].eliminationTimeoutObject);
        rooms[room].eliminationTimeoutObject = null;
    }
}

function scheduleRoomElimination(room) {    
    rooms[room].eliminationTimeoutObject = setTimeout(() => {
        if(Object.values(rooms[room].players).length === 0) {
            console.log('Eliminated', room);
            delete rooms[room];
            io.emit('publicRoomsChanged', getPublicRooms());
        } else {
            console.log('Not eliminated', room);
            rooms[room].eliminationTimeoutObject = null;
        }
    }, 6000); //The room will be removed if it has no players for 1 minute
}

function manageRoomDisconnect(room, playerUUID) {
    removePlayerFromRoom(room, playerUUID);

    if(Object.values(rooms[room].players).length === 0) {
        requestCancelRoomElimination(room);
        scheduleRoomElimination(room);
    }
}

function leaveGroup(socket, currentRoom, playerUUID) {
    socket.leave(currentRoom);
    manageRoomDisconnect(currentRoom, playerUUID);
    delete currentRooms[playerUUID];
    io.emit('publicRoomsChanged', getPublicRooms());
}

app.get('/', (req, res) => {
    res.send("Hola");
});

app.get('/rooms', (req, res) => {
    res.json(Object.keys(rooms));
});

app.get('/test/rooms', (req, res) => {
    let data = {};
    for(let room in rooms) {
        data[room] = {};
        for(key in rooms[room]) {
            if(!['intervalObject', 'eliminationTimeoutObject'].includes(key))
                data[room][key] = rooms[room][key];
        }
    }
    res.json({rooms:data, currentRooms});
});

app.post('/token/generate', (req, res) => {
    const playerUUID = uuid.v4();
    const token = jwt.sign({
        playerUUID
    }, SECRET);
    res.json({
        token,
        playerUUID
    });
});

app.get('/room/validate/:room', (req, res) => {
    const room = req.params.room;
    
    if(room in rooms) {
        return res.json({
            valid: true
        });
    }

    return res.json({
        valid: false
    });
});

io.on('connection', socket => {
    const token = socket.handshake.auth.token;
    const decoded = decodeToken(token);

    if(decoded == null) {
        socket.disconnect();
    } else {
        const playerUUID = decoded.playerUUID;

        socket.on('createRoom', () => {
            let generatedRoom = null;

            if(!(playerUUID in currentRooms)){
                while(true) {
                    generatedRoom = randomString(6);
                    if (!(generatedRoom in rooms)) {
                        rooms[generatedRoom] = {
                            roomId: generatedRoom,
                            host: playerUUID,
                            players: {},
                            playing: false,
                            roundDuration: 1,
                            category: null,
                            rounds: 1,
                            games: [],
                            inGame: false,
                            intervalObject: null,
                            remainingSeconds: null,
                            currentRound: 1,
                            roundRunning: false,
                            currentCountDown: 5,
                            inCountDown: false,
                            allowedMistakes: 7,
                            publicRoom: false,
                            eliminationTimeoutObject: null,
                            maxPlayers: 2,
                            messages: []
                        };
                        break;
                    }
                }
    
                socket.emit('roomCreated', generatedRoom);
            } else {
                console.log('Cannot create room')
            }

        });

        socket.on('join', (room, nickname, avatar) => {
            if(room in rooms) {
                if(playerUUID in currentRooms && currentRooms[playerUUID] !== room) {
                    console.log('You are in another room');
                    socket.emit('inAnotherRoom');
                } else {
                    socket.currentRoom = room;
    
                    if(!rooms[room].inGame) {
                        if(Object.keys(rooms[room].players).filter(x => x !== playerUUID).length === rooms[room].maxPlayers) {
                            socket.emit('maxPlayersReached');
                        } else {
                            requestCancelRoomElimination(room);
                            rooms[room].players[playerUUID] = {
                                nickname,
                                avatar,
                                isHost: playerUUID === rooms[room].host,
                                id: playerUUID,
                                inGame: false,
                                socketId: socket.id
                            };
                            socket.join(room);
                            io.to(room).emit(
                                'joined', 
                                Object.values(rooms[room].players).map(x => ({
                                    nickname: x.nickname,
                                    isHost: x.isHost,
                                    avatar: x.avatar,
                                    id: x.id
                                })), 
                                rooms[room].roundDuration,
                                rooms[room].category,
                                rooms[room].rounds,
                                rooms[room].publicRoom,
                                rooms[room].maxPlayers
                            );
                            io.emit('publicRoomsChanged', getPublicRooms());
                        }
                    } else if(playerUUID in rooms[room].players) {
                        socket.join(room);
                        socket.emit('gameStarted');
                    }  else {
                        console.log('La partida ya fue iniciada');
                    }
                }
            } else {
                console.log('Room not exists');
                socket.emit('roomNotExists');
            }
        });

        socket.on('requestCategories', () => {
            socket.emit('getCategories', Object.keys(categories));
        });

        socket.on('changeHost', (room, newHostId) => {
            if(decoded.playerUUID === rooms[room].host) {
                if(room in rooms) {
                    rooms[room].players[rooms[room].host].isHost = false;
                    rooms[room].host = newHostId;
                    rooms[room].players[rooms[room].host].isHost = true;
                }
                io.to(room).emit('changedHost', Object.values(rooms[room].players));
            }
        });

        socket.on('changeRoundDuration', (room, roundDuration) => {
            if(decoded.playerUUID === rooms[room].host) {
                rooms[room].roundDuration = roundDuration;
                io.to(room).emit('changedRoundDuration', rooms[room].roundDuration);
            }
        });

        socket.on('changeCategory', (room, category) => {
            if(decoded.playerUUID === rooms[room].host) {
                rooms[room].category = category;
                io.to(room).emit('changedCategory', rooms[room].category);
            }
        });

        socket.on('changeRounds', (room, rounds) => {
            if(decoded.playerUUID === rooms[room].host) {
                rooms[room].rounds = rounds;
                io.to(room).emit('changedRounds', rooms[room].rounds);
            }
        });

        socket.on('changePublicRoom', (room, publicRoom) => {
            if(decoded.playerUUID === rooms[room].host) {
                rooms[room].publicRoom = publicRoom;
                io.to(room).emit('changedPublicRoom', rooms[room].publicRoom);

                io.emit('publicRoomsChanged', getPublicRooms());
            }
        });

        socket.on('changeMaxPlayers', (room, publicRoom) => {
            if(decoded.playerUUID === rooms[room].host) {
                rooms[room].maxPlayers = publicRoom;
                io.to(room).emit('changeMaxPlayers', rooms[room].maxPlayers);

                io.emit('publicRoomsChanged', getPublicRooms());
            }
        });

        socket.on('requestPublicRooms', () => {
            socket.emit('publicRoomsChanged', getPublicRooms());
        });

        socket.on('startGame', room => {
            if(decoded.playerUUID === rooms[room].host) {
                Object.keys(rooms[room].players).map(player => {
                    currentRooms[player] = room;
                });

                manageWords(room);

                rooms[room].inGame = true;
                io.to(room).emit('gameStarted');
            }
        });

        socket.on('joinGame', () => {
            const room = currentRooms[playerUUID];

            if(room in rooms) {
                if(rooms[room].inGame) {
                    console.log('Joined to game', room, playerUUID);
    
                    if(!(playerUUID in rooms[room].players)) {
                        console.log('You are not in the game')
                    } else {
                        rooms[room].players[playerUUID].inGame = true;
        
                        if(!rooms[room].playing) {
                            const remainingPlayers = Object.values(rooms[room].players).filter(x => !x.inGame).length;
        
                            if(remainingPlayers === 0) {
                                rooms[room].playing = true;
                                console.log('All in game');
                                io.to(room).emit('everyoneInGame');
                                
                                manageRounds(room);
                            }
                        } else {
                            manageGameReconnect(room, socket, playerUUID);
                        }
        
                    }
                }
            } else {
                socket.emit('notInAGame');
            }
        });

        socket.on('guessLetter', (round, letter) => {
            const room = currentRooms[playerUUID];

            if(rooms[room].roundRunning && (rooms[room].currentRound === round)) {
                if(rooms[room].games[round - 1].players[playerUUID].mistakes < rooms[room].allowedMistakes) {
                    console.log('Sent letter', round, letter, rooms[room].remainingSeconds);
                    const completeWord = rooms[room].games[round - 1].word;
                    const playerWord = rooms[room].games[round - 1].players[playerUUID].word;

                    let guessed = false;

                    if(!playerWord.includes(letter)) {
                        const newPlayerWord = playerWord.split("").map((l, i) => {
                            if(letter === completeWord[i]) {
                                guessed = true;
                                return letter; 
                            } else {
                                return l;
                            }
                        }).join('');

                        rooms[room].games[round - 1].players[playerUUID].word = newPlayerWord;

                        socket.emit('guessedWord', rooms[room].games[round - 1].players[playerUUID].word);
                    }

                    if(!guessed) {
                        rooms[room].games[round - 1].players[playerUUID].mistakes++;
                        socket.emit('mistake', rooms[room].games[round - 1].players[playerUUID].mistakes);
                    }
                } else {
                    console.log('Lost')
                }
            } else {
                console.log('CANNOT SEND, ROUND ENDED', rooms[room].remainingSeconds);
            }
        });

        socket.on('requestLeaveCurrentRoom', () => {
            if(socket.currentRoom && socket.currentRoom in rooms) {
                leaveGroup(socket, socket.currentRoom, playerUUID);
            }
        });

        socket.on('leaveCurrentGame', () => {
            console.log('Requested leave');
            const currentRoom = currentRooms[playerUUID];
            
            if(currentRoom) {
                socket.leave(currentRoom);
                
                if(Object.keys(rooms[currentRoom].players).length > 1) {
                    delete rooms[currentRoom].players[playerUUID];

                    for(let game of rooms[currentRoom].games) {
                        delete game.players[playerUUID];
                    }
                } else {
                    clearInterval(rooms[currentRoom].intervalObject);
                    delete rooms[currentRoom];
                }

                delete currentRooms[playerUUID];
            }
        });

        socket.on('requestIsInGame', () => {
            if(playerUUID in currentRooms) {
                socket.emit('isInGame');
            }
        });

        socket.on('sendMessage', (room, message) => {
            rooms[room].messages.push({
                playerId: playerUUID,
                nickname: rooms[room].players[playerUUID].nickname,
                message
            });

            io.to(room).emit('newMessages', rooms[room].messages);
        });

        socket.on('requestMessages', room => {
            if(room in rooms) {
                socket.emit('newMessages', rooms[room].messages);
            }
        });

        socket.on('removeFromRoom', (room, player) => {
            io.to(rooms[room].players[player].socketId).emit('removed');
        });

        socket.on('disconnecting', reason => {
            console.log('Disconnected', reason);
            console.log(socket.rooms)

            if((socket.currentRoom in rooms) && (playerUUID in rooms[socket.currentRoom].players)) {
                if(!rooms[socket.currentRoom].inGame) {
                    manageRoomDisconnect(socket.currentRoom, playerUUID);
                    io.emit('publicRoomsChanged', getPublicRooms());
                }  else {
                    rooms[socket.currentRoom].players[playerUUID].inGame = false;
                }
            }
        });
    }
});

server.listen(port, () => {
    console.log('Listening on port', port);
});