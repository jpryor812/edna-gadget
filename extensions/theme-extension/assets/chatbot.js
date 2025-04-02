document.addEventListener("DOMContentLoaded", function () {
  // Add the mobile detection function here
  function detectMobileDevice() {
    const isMobile = window.innerWidth <= 768;
    document.body.classList.toggle('is-mobile', isMobile);
    
    // Add mobile detection on resize
    window.addEventListener('resize', function() {
      const isMobile = window.innerWidth <= 768;
      document.body.classList.toggle('is-mobile', isMobile);
    });
  }

  // Initialize mobile detection right away
  detectMobileDevice();
  
  // initialize an API client object
  const chatbotApi = new Gadget();

  // dom elements for chatbot
  const chatbotWindow = document.getElementById("chatbot-window");
  const chat = document.getElementById("chat");
  const chatForm = document.getElementById("chat-form");
  const chatInput = chatForm.elements.chatInput;
  const chatButton = chatForm.elements.chatButton;
  const chatbotToggle = document.getElementById("chatbot-toggle");
  const chatbotOpenToggle = document.getElementById("chatbot-open-toggle");
  const chatbotCloseToggle = document.getElementById("chatbot-close-toggle"); // This is missing
  const chatbotWindowClose = document.getElementById("chatbot-window-close");

  // IMPORTANT: Move the chatbot window to the document body
  // This ensures it can appear in front of everything
  if (chatbotWindow && chatbotWindow.parentElement !== document.body) {
    document.body.appendChild(chatbotWindow);
    console.log("Moved chatbot window to body");
  }
  // Add header if it doesn't exist yet
  if (chatbotWindow && !document.getElementById("chat-header")) {
    const header = document.createElement("div");
    header.id = "chat-header";
    header.innerHTML = "<h2>Edna</h2>";
    chatbotWindow.insertBefore(header, chatbotWindow.firstChild);
  }

  // Function to fetch and play the welcome message
  async function displayWelcomeMessage() {
    try {
      // Skip if welcome message already exists
      if (document.querySelector('#chat .bot.welcome-message')) {
        return;
      }
      
      // Fetch welcome audio
      const response = await chatbotApi.fetch("/welcome-audio", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      
      const data = await response.json();
      
      if (data.success && data.audio) {
        // Create welcome message bubble
        const welcomeMessage = document.createElement("p");
        welcomeMessage.classList.add("bot-welcome-message");
        
        // Use DOMPurify to sanitize the welcome message
        welcomeMessage.innerHTML = DOMPurify.sanitize(data.message);
        chat.appendChild(welcomeMessage);
        
        // Create audio container with speaker emoji toggle
        if (data.audio) {
          const audioContainer = document.createElement("div");
          audioContainer.classList.add("audio-container");
          audioContainer.style.margin = "2px 0";
          
          const toggleButton = document.createElement("button");
          toggleButton.id = "welcome-audio-toggle";
          toggleButton.classList.add("voice-toggle-button");
          toggleButton.style.cssText = "background: none; border: none; font-size: 16px; cursor: pointer; padding: 2px; outline: none;";
          toggleButton.innerHTML = "🔊";
          
          const audioElement = document.createElement("audio");
          audioElement.id = "welcome-audio";
          audioElement.autoplay = true;
          audioElement.style.display = "none";
          
          const sourceElement = document.createElement("source");
          sourceElement.src = `data:audio/mp3;base64,${data.audio}`;
          sourceElement.type = "audio/mp3";
          
          audioElement.appendChild(sourceElement);
          audioContainer.appendChild(toggleButton);
          audioContainer.appendChild(audioElement);
          welcomeMessage.appendChild(audioContainer);
          
          // Add script to manage audio toggling
          let isMuted = false;
          toggleButton.addEventListener('click', function() {
            isMuted = !isMuted;
            
            if (isMuted) {
              audioElement.pause();
              toggleButton.innerHTML = "🔇";
            } else {
              audioElement.play().catch(err => {
                console.log('Auto-play prevented by browser:', err);
              });
              toggleButton.innerHTML = "🔊";
            }
          });
          
          // Handle autoplay errors
          audioElement.addEventListener('play', function() {
            isMuted = false;
            toggleButton.innerHTML = "🔊";
          });
          
          audioElement.addEventListener('error', function(e) {
            console.error('Audio error:', e);
          });
          
          // Attempt autoplay
          audioElement.play().catch(err => {
            console.log('Auto-play prevented by browser:', err);
          });
        }
        
        // Scroll to the welcome message
        chat.scrollTop = chat.scrollHeight;
      } else {
        // Just display text if no audio
        const welcomeMessage = document.createElement("p");
        welcomeMessage.classList.add("bot", "welcome-message");
        welcomeMessage.textContent = "Hi, I'm Edna, your personal shopping assistant! I'm here to help you leave this store with that perfect outfit you can't wait to wear. What can I help you find today?";
        chat.appendChild(welcomeMessage);
      }
    } catch (error) {
      console.error("Error displaying welcome message:", error);
      
      // Fallback welcome message
      const welcomeMessage = document.createElement("p");
      welcomeMessage.classList.add("bot", "welcome-message");
      welcomeMessage.textContent = "Hi, I'm Edna, your personal shopping assistant! How can I help you today?";
      chat.appendChild(welcomeMessage);
    }
  }

  // Function definition moved properly inside DOMContentLoaded scope with correct indentation
  function initializeProductCarousels() {
    // Make product-containing chat bubbles full width
    const botMessages = document.querySelectorAll('#chatbot-window > #chat > .bot');
    if (botMessages.length > 0) {
      const latestMessage = botMessages[botMessages.length - 1];
      // Only add this class to old-style product cards, not our new product-display-reset containers
      if ((latestMessage.querySelector('.product-card') || 
          latestMessage.querySelector('.main-product-card')) && 
          !latestMessage.querySelector('.product-display-reset')) {
        latestMessage.classList.add('product-container-message');
      }
    }

    // Initialize any See Another Option buttons
    initializeSeeAnotherButtons();
  }

  // Initialize See Another Option buttons
  function initializeSeeAnotherButtons() {
    const seeAnotherButtons = document.querySelectorAll('.see-another-button:not([data-initialized])');
    seeAnotherButtons.forEach(button => {
      button.setAttribute('data-initialized', 'true');
      button.addEventListener('click', handleSeeAnotherClick);
    });
  }

  // Handler for See Another Option button clicks
  async function handleSeeAnotherClick(event) {
    // Disable the button to prevent multiple clicks
    event.target.disabled = true;
    event.target.textContent = "Finding another option...";
    
    // Get the product index from the button
    const productIndex = parseInt(event.target.getAttribute('data-product-index') || '0');
    
    // Get the last user message to reuse the query
    const userMessages = document.querySelectorAll('#chat .user');
    if (userMessages.length === 0) {
      event.target.textContent = "See Another Option";
      event.target.disabled = false;
      return;
    }
    
    const lastUserMessage = userMessages[userMessages.length - 1].textContent;
    
    // Add a "looking for more options" message
    const searchingMessage = document.createElement("p");
    searchingMessage.classList.add("bot");
    searchingMessage.textContent = "Looking for more options that might interest you...";
    chat.appendChild(searchingMessage);
    
    try {
      // Call Gadget API with the same message but with the product index
      const response = await chatbotApi.fetch("/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: lastUserMessage,
          productIndex: productIndex
        }),
        stream: true,
      });

      // Create a new bot message
      const chatbotResponse = document.createElement("p");
      chatbotResponse.classList.add("bot");
      chat.appendChild(chatbotResponse);
      
      // Read from the returned stream
      const decodedStreamReader = response.body
        .pipeThrough(new TextDecoderStream())
        .getReader();
      
      // Parse the stream data
      let replyText = "";
      while (true) {
        const { value, done } = await decodedStreamReader.read();
        
        if (done) {
          // Remove the searching message
          if (chat.contains(searchingMessage)) {
            chat.removeChild(searchingMessage);
          }
          
          // Initialize product carousels for the new content
          initializeProductCarousels();
          
          break;
        }
        
        // Append the stream data to the response text
        replyText += value;
        
        // Use DOMPurify to sanitize the response before adding to the DOM
        chatbotResponse.innerHTML = DOMPurify.sanitize(replyText);
      }
      
      // Scroll to the new content
      chat.scrollTop = chat.scrollHeight;
    } catch (error) {
      console.error("Error fetching more options:", error);
      
      // Display error message
      const errorMessage = document.createElement("p");
      errorMessage.classList.add("bot", "error");
      errorMessage.textContent = "Sorry, I couldn't find more options at the moment. Please try again.";
      chat.appendChild(errorMessage);
      
      // Remove the searching message
      if (chat.contains(searchingMessage)) {
        chat.removeChild(searchingMessage);
      }
    }
  }

  // fired when the chat form is submitted
  chatForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    
    // disable input and button
    chatInput.toggleAttribute("disabled");
    chatButton.toggleAttribute("disabled");

    // get user-inputted message
    const chatInputValue = chatInput.value;
    chatInput.value = "";

    // add input to chat window and disable input
    const userInput = document.createTextNode(chatInputValue);
    const userChatBubble = document.createElement("span");
    userChatBubble.classList.add("user");
    userChatBubble.appendChild(userInput);
    chat.appendChild(userChatBubble);
    chat.appendChild(document.createElement("br"));

    // add DOM elements for response
    const chatbotResponse = document.createElement("p");
    chatbotResponse.classList.add("bot");
    chat.appendChild(chatbotResponse);

    // add DOM elements for "thinking" indicator
    const chatbotThinking = document.createElement("p");
    const chatbotThinkingText = document.createTextNode("Thinking...");
    chatbotThinking.appendChild(chatbotThinkingText);
    chat.appendChild(chatbotThinking);

    // call Gadget /chat HTTP route with stream option
    const response = await chatbotApi.fetch("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: chatInputValue,
        productIndex: 0  // Initial request always uses first product
      }),
      stream: true,
    });

    // read from the returned stream
    const decodedStreamReader = response.body
      .pipeThrough(new TextDecoderStream())
      .getReader();

    // handle any stream errors
    decodedStreamReader.closed.catch((error) => {
      // display stream error
      const chatbotError = document.createElement("p");
      chatbotError.classList.add("error");
      const chatbotErrorText = document.createTextNode(
        `Sorry, something went wrong: ${error.toString()}`
      );
      chatbotError.appendChild(chatbotErrorText);
      chat.appendChild(chatbotError);
      // also add error to console
      console.error(error.toString());
    });

    // parse the stream data
    let replyText = "";
    while (true) {
      const { value, done } = await decodedStreamReader.read();

      // stop reading the stream
      if (done) {
        chatInput.toggleAttribute("disabled");
        chatButton.toggleAttribute("disabled");
        chat.removeChild(chatbotThinking);
        
        // Initialize product carousels
        initializeProductCarousels();
        
        break;
      }

      // append the stream data to the response text
      replyText += value;
      // use DOMPurify to sanitize the response before adding to the DOM
      chatbotResponse.innerHTML = DOMPurify.sanitize(replyText);
    }
    
    // Scroll to bottom
    const botMessages = document.querySelectorAll('#chatbot-window > #chat > .bot');
    if (botMessages.length > 0) {
      const latestMessage = botMessages[botMessages.length - 1];
      const introElement = latestMessage.querySelector('.product-recommendation-intro');
      
      if (introElement) {
        // Scroll to show just the intro and first product
        chat.scrollTop = latestMessage.offsetTop - 20;
      } else {
        // Default full scroll for normal messages
        chat.scrollTop = chat.scrollHeight;
      }
    }
  });

  chatbotToggle.addEventListener("click", function () {
    // toggle visibility of chatbot window
    chatbotWindow.classList.toggle("visible");
    
    // Toggle visibility of open/close buttons
    chatbotOpenToggle.classList.toggle("hidden");
    chatbotCloseToggle.classList.toggle("hidden");
    
    // Display welcome message when chat is first opened
    if (chatbotWindow.classList.contains("visible") && 
        chat.querySelectorAll('.bot, .bot-welcome-message').length === 0) {
      displayWelcomeMessage();
    }
  });
  
  // Add separate event listener for the close button
  chatbotCloseToggle.addEventListener("click", function() {
    chatbotWindow.classList.remove("visible");
    chatbotOpenToggle.classList.remove("hidden");
    chatbotCloseToggle.classList.add("hidden");
  });

  if (chatbotWindowClose) {
    chatbotWindowClose.addEventListener("click", function() {
      // Hide the chat window but don't clear messages
      chatbotWindow.classList.remove("visible");
      
      // Make sure the open toggle is visible and close toggle is hidden
      chatbotOpenToggle.classList.remove("hidden");
      chatbotCloseToggle.classList.add("hidden");
    });
  }
  
  if (chatbotCloseToggle) {  // Add this check
    chatbotCloseToggle.addEventListener("click", function() {
      chatbotWindow.classList.remove("visible");
      chatbotOpenToggle.classList.remove("hidden");
      chatbotCloseToggle.classList.add("hidden");
    });
  }
});
