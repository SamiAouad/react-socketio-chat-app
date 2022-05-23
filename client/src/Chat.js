import React, { useEffect, useState } from "react";
import ScrollToBottom from "react-scroll-to-bottom";
import publicKey from './static/public.key'
import InnerHTML from 'dangerously-set-html-content'

const CryptoJS = require("crypto-js");


let keySize = 256;
let ivSize = 128;
let iterations = 100;


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

function Chat({ socket, username, room }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [key, setKey] = useState('')

  const sendMessage = async () => {
    if (currentMessage !== "") {
      let ciphertext = encrypt(currentMessage, key);
      const messageData = {
        room: room,
        author: username,
        message: ciphertext,
        time:
          new Date(Date.now()).getHours() +
          ":" +
          new Date(Date.now()).getMinutes(),
      };

      await socket.emit("send_message", messageData);
      messageData["message"] = currentMessage;
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
    }
  };

  useEffect( () => {
    // socket.emit("public_key", key)
    socket.on("receive_key", (data) => {
      setKey(decrypt(data, "je suis mot de passe"))
    })
    socket.on("receive_message", (data) => {
      data["message"] = decrypt(data["message"], key).toString(CryptoJS.enc.Utf8);
      setMessageList((list) => [...list, data]);
      console.log(messageList)
    });
  }, [socket]);


  return (
    <div className="chat-window">
      <div className="chat-header" style={{color: "white"}}>
        <InnerHTML html={username} />
      </div>
      <div className="chat-body">
        <ScrollToBottom className="message-container">
          {messageList.map((messageContent) => {
            return (
              <div
                className="message"
                id={username === messageContent.author ? "you" : "other"}
              >
                <div>
                  <div className="message-content">
                    <p>{messageContent.message}</p>
                  </div>
                  <div className="message-meta">
                    <p id="time">{messageContent.time}</p>
                    <p id="author">{messageContent.author}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </ScrollToBottom>
      </div>
      <div className="chat-footer">
        <input
          type="text"
          value={currentMessage}
          placeholder="Hey..."
          onChange={(event) => {
            setCurrentMessage(event.target.value);
          }}
          onKeyPress={(event) => {
            event.key === "Enter" && sendMessage();
          }}
        />
        <button onClick={sendMessage}>&#9658;</button>
      </div>
    </div>
  );
}

export default Chat;
