// Import dependencies
import { ChatUI } from './components/ChatUI.js';
import { MessageHandler } from './components/MessageHandler.js';

document.addEventListener("DOMContentLoaded", function () {
  // Initialize an API client object
  const chatbotApi = new Gadget();
  
  // Create UI and message handler
  const chatUI = new ChatUI();
  const messageHandler = new MessageHandler(chatbotApi, chatUI);
  
  // Get DOM elements for chatbot
  const chatbotWindow = document.getElementById("chatbot-window");
  const chat = document.getElementById("chat");
  const chatForm = document.getElementById("chat-form");
  const chatInput = chatForm.elements.chatInput;
  const chatButton = chatForm.elements.chatButton;
  const chatbotToggle = document.getElementById("chatbot-toggle");
  const chatbotOpenToggle = document.getElementById("chatbot-open-toggle");
  const chatbotCloseToggle = document.getElementById("chatbot-close-toggle");
  
  // Add welcome message
  setTimeout(() => {
    const welcomeMessage = document.createElement("p");
    welcomeMessage.classList.add("bot");
    welcomeMessage.textContent = "Hi there! How can I help you today?";
    chat.appendChild(welcomeMessage);
  }, 500);
  
  // Fired when the chat form is submitted
  chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    
    // Disable input and button
    chatInput.toggleAttribute("disabled");
    chatButton.toggleAttribute("disabled");
    
    // Get user-inputted message
    const chatInputValue = chatInput.value;
    chatInput.value = "";
    
    // Add input to chat window
    const userInput = document.createTextNode(chatInputValue);
    const userChatBubble = document.createElement("span");
    userChatBubble.classList.add("user");
    userChatBubble.appendChild(userInput);
    chat.appendChild(userChatBubble);
    chat.appendChild(document.createElement("br"));
    
    // Add DOM elements for response
    const chatbotResponse = document.createElement("p");
    chatbotResponse.classList.add("bot");
    chat.appendChild(chatbotResponse);
    
    // Add DOM elements for "thinking" indicator
    const chatbotThinking = document.createElement("p");
    const chatbotThinkingText = document.createTextNode("Thinking...");
    chatbotThinking.appendChild(chatbotThinkingText);
    chat.appendChild(chatbotThinking);
    
    // Call Gadget /chat HTTP route with stream option
    const response = await chatbotApi.fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: chatInputValue,
      }),
      stream: true,
    });
    
    // Read from the returned stream
    const decodedStreamReader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();
    
    // Handle any stream errors
    decodedStreamReader.closed.catch((error) => {
      // Display stream error
      const chatbotError = document.createElement("p");
      chatbotError.classList.add("error");
      const chatbotErrorText = document.createTextNode(
        `Sorry, something went wrong: ${error.toString()}`
      );
      chatbotError.appendChild(chatbotErrorText);
      chat.appendChild(chatbotError);
      // Also add error to console
      console.error(error.toString());
    });
    
    // Parse the stream data
    let replyText = "";
    while (true) {
      const { value, done } = await decodedStreamReader.read();
      
      // Stop reading the stream
      if (done) {
        chatInput.toggleAttribute("disabled");
        chatButton.toggleAttribute("disabled");
        chat.removeChild(chatbotThinking);
        break;
      }
      
      // Append the stream data to the response text
      replyText += value;
      // Use DOMPurify to sanitize the response before adding to the DOM
      chatbotResponse.innerHTML = DOMPurify.sanitize(replyText);
    }
  });
  
  chatbotToggle.addEventListener("click", function () {
    // Toggle visibility of chatbot window
    chatbotWindow.classList.toggle("visible");
    chatbotOpenToggle.classList.toggle("hidden");
    chatbotCloseToggle.classList.toggle("hidden");
  });
  
  // Add voice input functionality if browser supports it
  if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    const voiceButton = document.querySelector('.voice-input');
    
    if (voiceButton) {
      voiceButton.addEventListener('click', function() {
        chatUI.toggleVoiceInput();
      });
    }
  }
});