var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.sendfile('public/index.html');
});

http.listen(5000, function(){
  console.log('listening on *:5000');
});

// usernames which are currently connected to the chat
var usernames = {};

// rooms which are currently available in chat
var rooms = ['room1','room2','room3'];

io.on('connection', function(socket){


  	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		// store the username in the socket session for this client
		socket.username = username;
		// store the room name in the socket session for this client
		socket.room = 'room1';
		// add the client's username to the global list
		usernames[username] = username;
		// send client to room 1
		socket.join('room1');
		// echo to client they've connected
		socket.emit('updatechat', 'SERVER', 'you have connected to room1', false);
		// echo to room 1 that a person has connected to their room
		socket.broadcast.to('room1').emit('updatechat', 'SERVER', username + ' has connected to this room', false);
		socket.emit('updaterooms', rooms, 'room1');
	});

		// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.in(socket.room).emit('updatechat', socket.username, data, true);
	});

	socket.on('addroom', function (roomName) {
		rooms.push(roomName);
		socket.emit('updaterooms', rooms, socket.room);
	})


	socket.on('switchRoom', function(newroom){
		// leave the current room (stored in session)
		socket.leave(socket.room);
		// join new room, received as function parameter
		socket.join(newroom);
		socket.emit('updatechat', 'SERVER', 'you have connected to '+ newroom, false);
		// sent message to OLD room
		socket.broadcast.to(socket.room).emit('updatechat', '', socket.username+' has left this room', false);
		// update socket session room title
		socket.room = newroom;
		socket.broadcast.to(newroom).emit('updatechat', '', socket.username+' has joined this room', false);
		socket.emit('updaterooms', rooms, newroom);
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[socket.username];
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected', false);
		socket.leave(socket.room);
	});

	socket.on('chat message', function(msg){
	    io.emit('chat message', msg);
	});
});



