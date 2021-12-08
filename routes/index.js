const mongoose = require('mongoose');
const router = require('express').Router();
const passport = require('passport');
const genPassword = require('../lib/passwordUtils').genPassword;
const connection = require('../config/database');
const User = connection.User;
const Chat = connection.Chat;
const Message = connection.Message;

// POST ROUTES

router.post('/login',
    passport.authenticate('local', {failureRedirect:'login-failure', successRedirect:'login-success'}));


router.post('/register', (req, res) => {
    const saltHash = genPassword(req.body.pw);

    const salt = saltHash.salt;
    const hash = saltHash.hash;

    const newUser = new User({
        username: req.body.uname,
        hash: hash,
        salt: salt
    });

    newUser.save()
        .then((user) =>{
            console.log(user);
        });

    res.redirect('/login');
});

router.post('/enterRoom', async (req, res) => {
    
    try {
        var nomeSala = req.body.room;

        console.log(nomeSala);

        let confirm = await Chat.findOne({name: nomeSala});

        if (confirm === null) {
            res.redirect('/alert-invalid')

        } else {

            let confirm1 = await User.findOne({"_id": req.user._id}, {chats:1}).populate({path:'chats', model: 'Chat'}).exec()
            var chatencontrado = false;
            console.log(confirm1)
            confirm1.chats.forEach(chat =>{
                if(chat.name === nomeSala){
                    chatencontrado = true;
                }
            })
            if(!chatencontrado){
                res.redirect('/alert-denied')

            }
            else{
                req.session.nomeChat = nomeSala;
                res.redirect('/user_page2');
            }
        }
    }
    catch(err){
        return err;
    }
});

router.post('/createRoom', async (req, res) => {

    const nameForNewChat = req.body.chatroom;
    const userId = req.user._id;


    console.log(nameForNewChat);

    let confirm = await Chat.findOne({name: nameForNewChat});

    console.log(confirm === null);

    if (confirm !== null) {
        res.send('<h1>That name for the room already exists</h1><p><a href="/chat_choice">Go Back</a></p>');
    } else {

        const newChat = new Chat({
            name: nameForNewChat,
            users: userId,
            nameHistory: nameForNewChat,
            admin: [userId]
        });


        await newChat.save()
            .then((user) => {
                console.log(user);
            });

        User.findOneAndUpdate({_id: userId}, {$push: {chats: newChat._id}}, function(error, success){
            if(error) {
                console.log(error);
            } else {
                console.log(success);
            }
        });
        await User.findOneAndUpdate({_id: userId}, {$push: {admin: newChat._id}})

        res.redirect('/user_page1');
    }

});


// GET ROUTES

router.get('/alert-invalid', (req,res)=>{
    res.render('alert', {alerttype: 'access-invalid' , alertmsg: '<p>O chat que indicaste não é válido. Tenta outra vez. <a href="/chat_choice">Go Back</a></p>'})
})

router.get('/alert-denied', (req,res)=>{
    res.render('alert', {alerttype: 'access-denied' , alertmsg: '<p>Não tem acesso a este chat. <a href="/chat_choice">Go Back</a></p>'})
})

router.get('/user_page1', async (req, res) => {
    if(req.isAuthenticated()){
        try {
            let result = await User.findById(req.user._id, {_id: 0,chats:1}).populate({path:'chats', model: 'Chat'}).exec()
            var count = 0;
            var i = 0;
            while(req.user.chats[i] !== undefined) {
                count += 1;
                i += 1;
            };
            console.log(count);

            var objectSala = result.chats[count-1];


            res.render('user_page', {user: req.user,chats: objectSala, chatCount: count});
        }
        catch(err){
            return err;
        }
}});


router.get('/user_page2', async (req, res) => {
    if(req.isAuthenticated()){
        try {

            var nomeSala = req.session.nomeChat;

            let result = await User.findById(req.user._id, {_id: 0,chats:1}).populate({path:'chats', model: 'Chat'}).exec()
            var count = 0;
            var i = 0;
            while(req.user.chats[i] !== undefined) {
                count += 1;
                i += 1;
            };
            console.log(count);
            var objectSala;
            for (var i = 0; i<count; i++){
                if(result.chats[i].name === nomeSala){
                    objectSala = result.chats[i];
                }
            }

            console.log(objectSala);
            console.log(req.user);
            res.render('user_page', {user: req.user,chats: objectSala, chatCount: count});
        }
        catch(err){
            return err;
        }
    }});


router.get('/chat_choice', async (req, res)=>{
    //console.log(req.body.uname);
    if(req.isAuthenticated()){
        try {
            let result = await User.findById(req.user._id, {_id: 0,chats:1}).populate({path:'chats', model: 'Chat'}).exec()
            var count = 0;
            var i = 0;
            while(req.user.chats[i] !== undefined) {
                count += 1;
                i += 1;
            };
            console.log(count);


            res.render('chat_choice', {user: req.user,chats: result, chatCount: count});
        }
        catch(err){
            return err;
        }


    } else{   
        res.send('<h1>You are not authenticated</h1><p><a href="/login">Login</a></p>');
    }
})


router.post('/invite', async (req,res)=>{
    console.log(req.body.selUser)
    console.log(req.body.chat)
    if(req.body.selUser){
        try{
            var userChatConfirm = await User.findOne({"_id": req.body.selUser}, {chats:1, _id:0});
            var chatencontrado = false;
            userChatConfirm.chats.forEach(chat => {
                if (chat._id == req.body.chat) {
                    chatencontrado = true;
                }
            });
            if ( !chatencontrado ) {
                const chatinvite = await Chat.findOneAndUpdate({"_id": req.body.chat}, {$push : {users: req.body.selUser}})
                const userupdate = await User.findOneAndUpdate({"_id": req.body.selUser}, {$push : {chats: req.body.chat}})
                console.log(chatinvite)
                console.log(userupdate)
                res.redirect(req.get('referer'))
            } else {
                res.redirect(req.get('referer'));
            }
        }
        catch(err){
        }
    }
})



router.get('/register', (req, res)=>{
    res.render('register');
})

router.get('/', (req, res)=>{
    res.redirect('/login');
});

router.get('/login', (req,res)=>{
    res.render('login');
})

router.get('/login-success', async (req, res) => {
    //console.log(req.user);
    res.render('alert', {alerttype: 'login-success' , alertmsg: '<p>You successfully logged in. --> <a href="/chat_choice">Go to user_page</a></p>'})


});

router.get('/login-failure', (req,res) =>{
    res.render('alert', {alerttype: 'login-failed' , alertmsg: '<p>You entered the wrong credentials <a href="/login">Go back</a></p>'})

});

router.get('/logout', (req,res) =>{
    req.logout();
    res.redirect('/login');
});


module.exports = router;




