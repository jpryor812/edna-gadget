// bundle-display.js
document.addEventListener("DOMContentLoaded", function () {
    // Initialize the Gadget API client
    const gadgetApi = new Gadget();
    
    // Get bundle display elements
    const bundleContainer = document.getElementById("bundle-display-container");
    if (!bundleContainer) return;
    
    // Get product ID and shop domain from data attributes
    const productId = bundleContainer.getAttribute("data-product-id");
    const shopDomain = bundleContainer.getAttribute("data-shop-domain");
    
    // Exit if no product ID or shop domain
    if (!productId || !shopDomain) {
      console.error("Missing product ID or shop domain for bundle display");
      return;
    }
    
// Fetch active bundle configuration
async function fetchBundleConfig() {
    try {
      // Log for debugging
      console.log("Fetching bundle config for shop:", shopDomain);
      
      // Request the active bundle configuration from Gadget
      const response = await gadgetApi.fetch("/bundle-config", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Add shop domain as a query parameter
        query: {
            shop: shopDomain,
            productId: productId
          }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bundle config: ${response.status}`);
      }
      
      const bundleConfig = await response.json();
      console.log("Retrieved bundle config:", bundleConfig);
      return bundleConfig;
    } catch (error) {
      console.error("Error fetching bundle configuration:", error);
      return null;
    }
  }
    
    // Render bundle discount squares
    function renderDiscountSquares(bundleConfig) {
      if (!bundleConfig) {
        // Hide container if no config
        bundleContainer.classList.add("hidden");
        return;
      }
      
      const squaresContainer = bundleContainer.querySelector(".bundle-discount-squares-container");
      if (!squaresContainer) return;
      
      // Clear loading message
      squaresContainer.innerHTML = "";
      
      // Extract discount values
      const discounts = [
        bundleConfig.Item1Discount || 0,
        bundleConfig.Item2Discount || 0,
        bundleConfig.Item3Discount || 0,
        bundleConfig.Item4Discount || 0,
        bundleConfig.Item5Discount || 0
      ];
      
      // Only proceed if we have valid discounts
      const hasDiscounts = discounts.some(discount => discount > 0);
      if (!hasDiscounts) {
        bundleContainer.classList.add("hidden");
        return;
      }
      
      // Create HTML for each discount square
      discounts.forEach((discount, index) => {
        if (discount > 0) {

          const baseIntensity = Math.sqrt(discount / 100) * 0.8 + 0.2; // Minimum intensity of 0.2
          const intensityFactor = Math.min(baseIntensity, 0.95);
          
          // Use the same green but with adjusted intensity
          const backgroundColor = `rgba(50, 175, 0, ${intensityFactor})`;
          const textColor = '#ffffff';
          
          // Create square element
          const square = document.createElement("div");
          square.className = "discount-square";
          square.style.backgroundColor = backgroundColor;
          square.style.color = textColor;
          
          // Add discount and item label
          square.innerHTML = `
            <div class="discount-percentage">${discount}%</div>
            <div class="discount-item-label">Item ${index + 1}</div>
          `;
          
          // Add to container
          squaresContainer.appendChild(square);
        }
      });
      
      // Show explanation text
      bundleContainer.querySelector(".bundle-explanation").classList.remove("hidden");
      
      // Show container
      bundleContainer.classList.remove("hidden");
    }
    
    // Initialize bundle display
    async function initBundleDisplay() {
      const bundleConfig = await fetchBundleConfig();
      renderDiscountSquares(bundleConfig);
    }
    
    // Start initialization
    initBundleDisplay();
  });