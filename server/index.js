const express = require("express");
const app = express();
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
app.use(cors());
const crypto = require('crypto');
const CryptoJS = require("crypto-js");


let keySize = 256;
let ivSize = 128;
let iterations = 100;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://localhost:3000",
    methods: ["GET", "POST"],
  },
});

function encrypt (msg, pass) {
  let salt = CryptoJS.lib.WordArray.random(128/8);

  let key = CryptoJS.PBKDF2(pass, salt, {
    keySize: keySize/32,
    iterations: iterations
  });

  let iv = CryptoJS.lib.WordArray.random(128/8);

  let encrypted = CryptoJS.AES.encrypt(msg, key, {
    iv: iv, // block size
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC

  });

  // salt, iv will be hex 32 in length
  // append them to the ciphertext for use  in decryption
  let transitmessage = salt.toString()+ iv.toString() + encrypted.toString();
  return transitmessage;
}
function power(a, b, p)
{
  if (b === 1)
    return a;
  else
    return((Math.pow(a, b)) % p);
}

function decrypt (transitmessage, pass) {
  let salt = CryptoJS.enc.Hex.parse(transitmessage.substr(0, 32));
  let iv = CryptoJS.enc.Hex.parse(transitmessage.substr(32, 32))
  let encrypted = transitmessage.substring(64);

  let key = CryptoJS.PBKDF2(pass, salt, {
    keySize: keySize/32,
    iterations: iterations
  });

  let decrypted = CryptoJS.AES.decrypt(encrypted, key, {
    iv: iv,
    padding: CryptoJS.pad.Pkcs7,
    mode: CryptoJS.mode.CBC

  })
  return decrypted;
}


function generateKey(length) {
  let result           = '';
  let characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789$^%://;,@^`-|()}{#&';
  let charactersLength = characters.length;
  for ( let i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() *
        charactersLength));
  }
  return result;
}



io.on("connection", (socket) => {
  console.log(`User Connected: ${socket.id}`);
  let key = generateKey(256)
  socket.on("join_room", (room) => {
    socket.join(room);
    console.log(`User with ID: ${socket.id} joined room: ${room}`);
  });

  socket.emit('receive_key',encrypt(key, "je suis mot de passe"));

  socket.on("send_message", (data) => {
    console.log(data.message)
    socket.to(data.room).emit("receive_message", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

server.listen(3001, () => {
  console.log("SERVER RUNNING");
});
