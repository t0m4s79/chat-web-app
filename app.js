const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const crypto = require('crypto');
const routes = require('./routes');
const connection = require('./config/database');
const path = require('path');
const Chat = connection.Chat;
const Message = connection.Message;
const User = connection.User;
const {userJoin, getCurrentUser, userLeave, getRoomUsers} = require('./lib/usersUtils');
const moment = require('moment');

const MongoStore = require('connect-mongo');

require('dotenv').config();

var app = express();

app.use(express.static(path.join(__dirname, '/public')));
app.use(express.json());
app.use(express.urlencoded({extended:true}));

var http = require('http').createServer(app);
var io = require('socket.io')(http);

app.set('view engine', 'ejs');

app.use(session({
    secret:process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    store: MongoStore.create({
        mongoUrl: process.env.DB_STRING,
        collectionName: 'sessions'
    }),
    cookie:{
        maxAge: 1000 * 60 * 60 * 24
    }
}))


// PASSPORT AUTHENTICATION

require('./config/passport');

app.use(passport.initialize());
app.use(passport.session());

// ROUTES

// Imports all of the routes from ./routes/index.js
app.use(routes);

people = {};

io.on('connection',function(socket){


    socket.on('joinRoom', (utilizador) => {

        const user = userJoin(socket.id, utilizador.nome, utilizador.sala);
        console.log(user);
        socket.join(user.room)

        // Broadcast when a user connects
        let message = {id: user.username, msg: ' has joined the room'};
        socket.broadcast.to(user.room).emit('update', message);
        var showUsers = getRoomUsers(user.room)
        
        // Send users and room info
        io.to(user.room).emit('room users', showUsers)

    });

    socket.on('get messages', async (chatid)=>{
        console.log("chatid is: " + chatid)
        try{
            var result = await Chat.findById(chatid,{_id:0, messages:1})
                .populate({path: 'messages', model:'Message', populate:{path:'user', model:'User'}})
                .exec()
            console.log(result)
            socket.emit('receive messages', result)
        }catch(e){
            console.log(e)
        }
    })

    // Listen for chatMessage
    socket.on('chat message', async msg =>{

        const user = getCurrentUser(socket.id);
        console.log('message: '+ JSON.stringify(msg));

        try{
            var mensagem = {content: msg.content, user: msg.username};
            const message = new Message({
                text: mensagem.content,
                date: new Date().toLocaleString(),
                user: msg.userid
            })
            //Awaits to insert message into db
            var result = await message.save()
            await Chat.findOneAndUpdate({"_id": msg.chatid},{$push : {messages: result._id}})
            console.log(result)
            const messg = {text: result.text, date: result.date, user: msg.username}
            io.to(user.room).emit('message', messg);
        }
        catch (e) {
            console.log(e)
        }
    });

    //Find if user is admin of the current chat
    socket.on('check admin', async data =>{
        try{
            var user = await User.findById(data.user, {admin:1})
            console.log(user)
            user.admin.forEach(elem=>{
                if(elem == data.chatid){
                    console.log("user is admin of "+ data.chatid)
                    socket.emit('confirm admin', user)
                }
                else {
                    console.log("user is not admin")
                }
            })
        }
        catch(e){
            return e
        }
    })

    //Find all users except given current
    socket.on('request users', async userid =>{
        try{
            var result = await User.find({'_id': { $ne: userid}}, {username:1})   //$ne -> not equal
            console.log(result)
            socket.emit('show users', result)
        }
        catch(err){
            return err
        }
    })

    // Runs when client disconnects
    socket.on('disconnect', () => {
        const user = userLeave(socket.id);

        if(user) {
            let message = {id: user.username, msg: ' has left the room'};
            io.to(user.room).emit('update', message );

            
            // Send users and room info
            let showUsers = getRoomUsers(user.room);
            io.to(user.room).emit('room users', showUsers); 
             
        }

    });

});

// SERVER

http.listen(3000, () =>{
    console.log('Server running in port 3000');
});


