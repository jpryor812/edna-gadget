export class ChatUI {
    constructor(config) {
      this.config = config;
      this.isListening = false;
      
      // Create DOM elements
      this.container = this.createContainer();
      this.overlay = this.createOverlay();
      this.toggleButton = this.createToggleButton();
      this.chatInterface = this.createChatInterface();
      
      // Add elements to DOM
      this.container.appendChild(this.toggleButton);
      this.container.appendChild(this.chatInterface);
      
      // Initialize speech recognition if available
      this.initSpeechRecognition();
    }
    
    createContainer() {
      const container = document.createElement("div");
      container.id = "chatbot-window";
      document.body.appendChild(container);
      return container;
    }
    
    createOverlay() {
      const overlay = document.createElement("div");
      overlay.id = "chatbot-overlay";
      document.body.appendChild(overlay);
      return overlay;
    }
    
    createToggleButton() {
      const button = document.createElement("button");
      button.id = "chatbot-toggle";
      button.setAttribute("aria-label", "Toggle chatbot");
      button.className = "chatbot-toggle";
      
      // Create nested toggle buttons
      const openToggle = document.createElement("span");
      openToggle.id = "chatbot-open-toggle";
      openToggle.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 10H8.01M12 10H12.01M16 10H16.01M9 16H5C3.89543 16 3 15.1046 3 14V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V14C21 15.1046 20.1046 16 19 16H14L9 21V16Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      
      const closeToggle = document.createElement("span");
      closeToggle.id = "chatbot-close-toggle";
      closeToggle.className = "hidden";
      closeToggle.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 18L18 6M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      `;
      
      button.appendChild(openToggle);
      button.appendChild(closeToggle);
      
      return button;
    }
    
    createChatInterface() {
      const chatInterface = document.createElement("div");
      chatInterface.id = "chat-container";
      
      // Add chat content
      chatInterface.innerHTML = `
        <div class="chat-header">
          <h3 class="chat-title">AI Assistant</h3>
        </div>
        <div id="chat"></div>
        <div class="chat-input-container">
          <form id="chat-form">
            <input type="text" name="chatInput" id="chat-input" placeholder="Type your message..." aria-label="Type your message">
            <button type="button" class="voice-input" aria-label="Voice input">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 11C19 14.866 15.866 18 12 18M12 18C8.13401 18 5 14.866 5 11M12 18V22M12 22H8M12 22H16M12 14C10.3431 14 9 12.6569 9 11V5C9 3.34315 10.3431 2 12 2C13.6569 2 15 3.34315 15 5V11C15 12.6569 13.6569 14 12 14Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <button type="submit" name="chatButton" id="chat-button" aria-label="Send message">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 5L21 12M21 12L14 19M21 12H3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
          </form>
        </div>
      `;
      
      return chatInterface;
    }
    
    toggleChatVisibility(isOpen) {
      if (isOpen) {
        this.chatInterface.classList.add("visible");
        document.getElementById("chatbot-open-toggle").classList.add("hidden");
        document.getElementById("chatbot-close-toggle").classList.remove("hidden");
      } else {
        this.chatInterface.classList.remove("visible");
        document.getElementById("chatbot-open-toggle").classList.remove("hidden");
        document.getElementById("chatbot-close-toggle").classList.add("hidden");
      }
    }
    
    addMessage(text, isUser) {
      const chat = document.getElementById("chat");
      
      if (isUser) {
        // Add user message
        const userInput = document.createTextNode(text);
        const userChatBubble = document.createElement("span");
        userChatBubble.classList.add("user");
        userChatBubble.appendChild(userInput);
        chat.appendChild(userChatBubble);
        chat.appendChild(document.createElement("br"));
      } else {
        // Add assistant message
        const botChatBubble = document.createElement("p");
        botChatBubble.classList.add("bot");
        botChatBubble.textContent = text;
        chat.appendChild(botChatBubble);
      }
      
      // Scroll to bottom
      chat.scrollTop = chat.scrollHeight;
    }
    
    showTypingIndicator() {
      const chat = document.getElementById("chat");
      
      const chatbotThinking = document.createElement("p");
      chatbotThinking.id = "thinking-indicator";
      const chatbotThinkingText = document.createTextNode("Thinking...");
      chatbotThinking.appendChild(chatbotThinkingText);
      chat.appendChild(chatbotThinking);
      
      // Scroll to bottom
      chat.scrollTop = chat.scrollHeight;
    }
    
    hideTypingIndicator() {
      const thinkingIndicator = document.getElementById("thinking-indicator");
      if (thinkingIndicator) {
        thinkingIndicator.remove();
      }
    }
    
    initSpeechRecognition() {
      if (window.SpeechRecognition || window.webkitSpeechRecognition) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        
        this.recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          const inputField = document.getElementById("chat-input");
          inputField.value = transcript;
          
          // Auto submit after voice input
          const form = document.getElementById("chat-form");
          form.dispatchEvent(new Event('submit'));
        };
        
        this.recognition.onend = () => {
          this.isListening = false;
          this.updateVoiceButtonState();
        };
        
        this.recognition.onerror = () => {
          this.isListening = false;
          this.updateVoiceButtonState();
        };
      }
    }
    
    toggleVoiceInput() {
      if (!this.recognition) return;
      
      this.isListening = !this.isListening;
      
      if (this.isListening) {
        this.recognition.start();
      } else {
        this.recognition.stop();
      }
      
      this.updateVoiceButtonState();
    }
    
    updateVoiceButtonState() {
      const voiceButton = document.querySelector('.voice-input');
      
      if (this.isListening) {
        voiceButton.classList.add('listening');
      } else {
        voiceButton.classList.remove('listening');
      }
    }
  }