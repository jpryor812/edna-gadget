export class MessageHandler {
    constructor(apiClient, chatUI) {
      this.apiClient = apiClient;
      this.chatUI = chatUI;
    }
    
    /**
     * Process a message using streaming response
     * @param {string} message - The user's message
     */
    async processMessageWithStreaming(message) {
      try {
        // Show typing indicator
        this.chatUI.showTypingIndicator();
        
        // Call Gadget /chat HTTP route with stream option
        const response = await this.apiClient.fetch("/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: message,
          }),
          stream: true,
        });
        
        // Process the streaming response
        await this.handleStreamingResponse(response);
        
      } catch (error) {
        console.error('Error processing message:', error);
        this.chatUI.hideTypingIndicator();
        this.chatUI.addMessage("Sorry, something went wrong. Please try again.", false);
      }
    }
    
    /**
     * Handle the streaming response from the API
     * @param {Response} response - The fetch response
     */
    async handleStreamingResponse(response) {
      try {
        // Hide typing indicator since we'll be streaming content
        this.chatUI.hideTypingIndicator();
        
        // Create a placeholder for the streaming response
        const messageEl = document.createElement('div');
        messageEl.className = 'edna-message edna-assistant-message';
        
        const avatar = document.createElement('div');
        avatar.className = 'edna-avatar';
        avatar.style.background = `linear-gradient(to bottom right, ${this.chatUI.config.primaryColor}, ${this.chatUI.config.secondaryColor})`;
        messageEl.appendChild(avatar);
        
        const bubble = document.createElement('div');
        bubble.className = 'edna-message-bubble';
        messageEl.appendChild(bubble);
        
        const messagesContainer = this.chatUI.chatInterface.querySelector('.edna-chat-messages');
        messagesContainer.appendChild(messageEl);
        
        // Read from the returned stream
        const decodedStreamReader = response.body
          .pipeThrough(new TextDecoderStream())
          .getReader();
        
        // Handle any stream errors
        decodedStreamReader.closed.catch((error) => {
          console.error('Stream error:', error.toString());
          bubble.textContent += "\n\nSorry, the connection was interrupted.";
        });
        
        // Parse the stream data
        let replyText = "";
        while (true) {
          const { value, done } = await decodedStreamReader.read();
          
          // stop reading the stream
          if (done) {
            break;
          }
          
          // append the stream data to the response text
          replyText += value;
          
          // Sanitize and update the UI
          bubble.innerHTML = DOMPurify.sanitize(replyText);
          
          // Scroll to bottom
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
      } catch (error) {
        console.error('Error handling streaming response:', error);
        this.chatUI.addMessage("Sorry, there was an error processing the response.", false);
      }
    }
  }