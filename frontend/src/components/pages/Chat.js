import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { useParams, useNavigate } from 'react-router-dom';
import '../../styles/Chat.css';
import { backendEndpoint } from '../../config';
import axios from 'axios';

const Chat = () => {
  const { user } = useAuth();
  const { roomName } = useParams(); // Get roomName from URL params
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isValidRoom, setIsValidRoom] = useState(false);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const checkRoomExists = useCallback(async () => {
    try {
      const response = await axios.get(`${backendEndpoint}/api/rooms/${roomName}`, { withCredentials: true });
      if (response.data.success) {
        setIsValidRoom(true);
      } else {
        alert('Room does not exist');
        navigate('/');
      }
    } catch (error) {
      console.error('Error checking room existence', error);
      alert('Error checking room existence');
      navigate('/');
    }
  }, [roomName, navigate]);

  useEffect(() => {
    if (!roomName) {
      console.log('room name not defined');
      navigate('/');
    } else {
      checkRoomExists();
    }
  }, [roomName, navigate, checkRoomExists]);

  useEffect(() => {
    if (isValidRoom) {
      window.addEventListener('beforeunload', handleUnload);

      socketRef.current = io(backendEndpoint, {
        withCredentials: true
      });

      socketRef.current.on('connect', () => {
        // console.log('Connected to backend socket');
        socketRef.current.emit('joinRoom', roomName);
      });

      socketRef.current.on('previousMessages', (previousMessages) => {
        console.log(previousMessages);
        setMessages(previousMessages);
      });

      socketRef.current.on('chatMessage', (message) => {
        // console.log(message);
        setMessages((prevMessages) => [...prevMessages, message]);
      });

      socketRef.current.on('updateActiveUsers', (activeUsers) => {
        // console.log('Active users:', activeUsers);
      });

      return () => {
        window.removeEventListener('beforeunload', handleUnload);
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [isValidRoom, roomName]); // Reconnect when roomName changes and room is valid

  // Function to handle the beforeunload event
  const handleUnload = () => {
    // Disconnect the socket when the user navigates away
    socketRef.current.disconnect();
  };

  const handleSendMessage = () => {
    if (newMessage.trim() && socketRef.current) {
      socketRef.current.emit('chatMessage', newMessage);
      setNewMessage('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    const formattedDate = `${date.getDate()}/${date.getMonth() + 1}-${String(date.getFullYear()).slice(2)}:${(date.getHours() < 10 ? '0' : '') + date.getHours()}:${(date.getMinutes() < 10 ? '0' : '') + date.getMinutes()}`;
    return formattedDate;
  }

  return (
    <div className="chat-container">
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className="message">
            <div>
              <span className="username">{message.username} </span>
              <em className="timestamp">{formatTimestamp(message.timestamp)}</em>
            </div>
            <span className="message-content">{message.message}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="message-input-container">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
};

export default Chat;
