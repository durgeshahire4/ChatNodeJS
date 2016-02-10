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
var ChatRooms = {
	rooms : ['room1','room2','room3'],
	peoples : ['people1','people2','people3']
}

io.on('connection', function(socket){

  	// when the client emits 'adduser', this listens and executes
	socket.on('adduser', function(username){
		var defaultCurrentSelection = ChatRooms.rooms[0];
		// store the username in the socket session for this client
		socket.username = username;
		// store the room name in the socket session for this client
		socket.currentSelection = {
			label : defaultCurrentSelection,
			type : 'room'
		};
		// add the client's username to the global list
		usernames[username] = username;
		// send client to room 1
		socket.join(defaultCurrentSelection);
		// echo to client they've connected
		socket.emit('updatechat', 'SERVER', 'you have connected to '+ defaultCurrentSelection, false);
		// echo to room 1 that a person has connected to their room
		socket.broadcast.to(defaultCurrentSelection).emit('updatechat', 'SERVER', username + ' has connected to this room', false);
		socket.emit('updateChatRooms', ChatRooms , socket.currentSelection);
	});

		// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (data) {
		// we tell the client to execute 'updatechat' with 2 parameters
		io.in(socket.currentSelection.label).emit('updatechat', socket.username, data, true);
	});

	socket.on('addroom', function (roomName) {
		ChatRooms.rooms.push(roomName);
		socket.emit('updateChatRooms', ChatRooms, socket.currentSelection);
	});
	socket.on('addpeople', function (peopleName) {
		ChatRooms.peoples.push(peopleName);
		socket.emit('updateChatRooms', ChatRooms, socket.currentSelection);
	})


	socket.on('switchChats', function(newChat){
		// leave the current room (stored in session)
		socket.leave(socket.currentSelection.label);
		// join new room, received as function parameter
		socket.join(newChat.label);
		socket.emit('updatechat', 'SERVER', 'you have connected to '+ newChat.label, false);
		// sent message to OLD room
		socket.broadcast.to(socket.currentSelection.label).emit('updatechat', '', socket.username+' has left this'+newChat.label, false);
		// update socket session room title
		socket.currentSelection = newChat;
		socket.broadcast.to(newChat.label).emit('updatechat', '', socket.username+' has joined this '+newChat.label, false);
		socket.emit('updateChatRooms', ChatRooms, socket.currentSelection);
	});

	// when the user disconnects.. perform this
	socket.on('disconnect', function(){
		// remove the username from global usernames list
		delete usernames[socket.username];
		// update list of users in chat, client-side
		io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected', false);
		socket.leave(socket.currentSelection.label);
	});

	socket.on('chat message', function(msg){
	    io.emit('chat message', msg);
	});
});



