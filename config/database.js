const mongoose = require('mongoose');

require('dotenv').config();


const conn = process.env.DB_STRING;

const connection = mongoose.connect(conn, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});

const MessageSchema = new mongoose.Schema({
    text: String,
    date: String,
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    replies: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    }]
});

const ChatSchema = new mongoose.Schema({
    name: String,
    date: Date,
    messages: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message'
        }
    ],
    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    nameHistory: {
        type: String
    },
    admin: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    ]

});

const UserSchema = new mongoose.Schema({
    username: String,
    hash: String,
    salt: String,
    chats: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
    }],
    admin: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
    }],
    invites: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invites',
    }]
});

const InviteSchema = new mongoose.Schema({
    status: String,
    to: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    from: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    chats: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chat',
    }
});

const Invite = mongoose.model('Invite', InviteSchema);
const User = mongoose.model('User', UserSchema);
const Chat = mongoose.model('Chat', ChatSchema);
const Message = mongoose.model('Message', MessageSchema);

// Expose the connection
module.exports = {
    connection,
    User,
    Chat,
    Message,
    Invite
}