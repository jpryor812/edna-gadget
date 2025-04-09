// bundle-display.js - Modified to use Gadget POST-bundle-cart API

document.addEventListener("DOMContentLoaded", function() {
    // Get the bundle container
    const bundleContainer = document.getElementById('bundle-display-container');
    if (!bundleContainer) return;
  
    // Get current product details from data attributes
    const currentProductId = bundleContainer.getAttribute('data-product-id');
    const shopDomain = bundleContainer.getAttribute('data-shop-domain');
  
    if (!currentProductId || !shopDomain) {
      console.warn('Bundle display: Missing product ID or shop domain');
      const loadingElement = bundleContainer.querySelector('.bundle-loading');
      if (loadingElement) {
        loadingElement.innerHTML = 'Could not initialize bundle display';
      }
      return;
    }

    let currentPage = 1;
    let perPage = 40;
    let totalPages = 1;
    let totalProducts = 0;

    gadgetApi = new Gadget();
    
    // Start loading all the necessary data
    initializeBundleDisplay();
    
    /**
     * Initialize the bundle display by fetching all required data
     */
    async function initializeBundleDisplay() {
        try {
          // 1. Fetch bundle discount configuration
          const bundleConfigPromise = fetchBundleConfig();
          
          // 2. Fetch product recommendations
          const recommendationsPromise = fetchProductRecommendations();
          
          // 3. Fetch additional store products 
          const storeProductsPromise = fetchStoreProducts(1);
          
          // 4. Wait for all promises to resolve
          const [bundleConfig, recommendations, storeProductsData] = await Promise.all([
            bundleConfigPromise,
            recommendationsPromise,
            storeProductsPromise
          ]);
          
          // Get the actual store products array from the response
          const storeProducts = storeProductsData.products || [];
          
          // Update pagination if provided
          if (storeProductsData.pagination) {
            currentPage = storeProductsData.pagination.currentPage;
            totalPages = storeProductsData.pagination.totalPages;
            totalProducts = storeProductsData.pagination.totalCount;
          }
          
          console.log("Bundle config:", bundleConfig);
          console.log("Recommendations:", recommendations);
          console.log("Store products:", storeProducts);
          console.log("Pagination:", { currentPage, totalPages, totalProducts });
          
          // 5. Combine recommendations and store products, removing duplicates
          // Note: We're now working with IDs that have both product and variant info
          const recommendationIds = new Set();
          recommendations.forEach(p => {
            if (p.productId) {
              recommendationIds.add(p.productId);
            } else if (p.id && p.id.includes('-')) {
              recommendationIds.add(p.id.split('-')[0]);
            }
          });
          
          const filteredStoreProducts = storeProducts.filter(p => {
            const productPartOfId = p.productId || (p.id && p.id.includes('-') ? p.id.split('-')[0] : p.id);
            return !recommendationIds.has(productPartOfId);
          });
          
          // 6. Create combined product list with recommendations first
          const allProducts = [
            ...recommendations.map(p => ({ ...p, isRecommended: true })),
            ...filteredStoreProducts.map(p => ({ ...p, isRecommended: false }))
          ];
          
          console.log("Combined products:", allProducts.length);
          
          // 7. Render the bundle display with all the data
          renderBundleDisplay(bundleConfig, allProducts);
        } catch (error) {
          console.error("Failed to initialize bundle display:", error);
          const loadingElement = bundleContainer.querySelector('.bundle-loading');
          if (loadingElement) {
            loadingElement.innerHTML = 'Could not load bundle information';
          }
        }
      }      
    
    /**
     * Fetch bundle configuration from the Gadget API
     */
    async function fetchBundleConfig() {
      try {
        // Make request to bundle-config endpoint without type parameter (default behavior)
        const response = await gadgetApi.fetch(`/bundle-config?shop=${shopDomain}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch bundle config: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching bundle configuration:", error);
        // Return default config on error
        return {
          Item1Discount: 20,
          Item2Discount: 40,
          Item3Discount: 60,
          Item4Discount: 80,
          Item5Discount: 100
        };
      }
    }
    
    /**
     * Fetch product recommendations from the Gadget API
     */
    async function fetchProductRecommendations() {
      try {
        // Make request to bundle-config endpoint with type=recommendations
        const response = await gadgetApi.fetch(
          `/bundle-config?type=recommendations&productId=${currentProductId}&shop=${shopDomain}`
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch recommendations: ${response.status}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error("Error fetching product recommendations:", error);
        return []; // Return empty array on error
      }
    }
    
    /**
     * Fetch additional store products from the Gadget API
     */
    async function fetchStoreProducts(page = 1) {
        try {
          // Make request to bundle-config endpoint with type=products and pagination
          const response = await gadgetApi.fetch(
            `/bundle-config?type=products&productId=${currentProductId}&shop=${shopDomain}&page=${page}&perPage=${perPage}`
          );
          
          if (!response.ok) {
            throw new Error(`Failed to fetch store products: ${response.status}`);
          }
          
          const data = await response.json();
          
          // Update pagination state if pagination info is provided
          if (data.pagination) {
            currentPage = data.pagination.currentPage;
            totalPages = data.pagination.totalPages;
            totalProducts = data.pagination.totalCount;
          }
          
          // Return products array or empty array
          return data.products || [];
        } catch (error) {
          console.error("Error fetching store products:", error);
          return []; // Return empty array on error
        }
      }
      
    
    /**
     * Ensure a price value is a number
     */
    function ensureNumericPrice(price) {
      if (typeof price === 'number') return price;
      if (typeof price === 'string') {
        // Try to convert string to number
        return parseFloat(price.replace(/[^0-9.]/g, '')) || 0;
      }
      return 0;
    }
    
    /**
     * Render the bundle display with the fetched data
     */
    function renderBundleDisplay(bundleConfig, complementaryProducts) {
      // Get current product details from the page
      const productTitle = document.querySelector('.product__title')?.textContent || 
                          document.querySelector('h1.product-title')?.textContent || 
                          'Current Product';
      
      const productPrice = document.querySelector('.product__price')?.textContent || 
                          document.querySelector('.price__regular .price-item')?.textContent || 
                          '$0.00';
      
      const productImage = document.querySelector('.product__media img')?.src || 
                          document.querySelector('.product-featured-media')?.src || 
                          '';
      
      const currentVariantId = document.querySelector('input[name="id"]')?.value || 
                              document.querySelector('[data-product-id]')?.getAttribute('data-product-id');
      
      // Get numeric price
      const numericPrice = parseFloat(productPrice.replace(/[^0-9.]/g, '')) || 0;
      
      // Clear loading message and current content
      bundleContainer.innerHTML = '';
      
      // Add header
      const headerElement = document.createElement('h3');
      headerElement.className = 'bundle-display-header';
      headerElement.textContent = 'Save When You Bundle';
      bundleContainer.appendChild(headerElement);
      
      // Add explanation if we have discounts
      const hasDiscounts = bundleConfig && Object.values(bundleConfig).some(val => val > 0);
      if (hasDiscounts) {
        const explanationElement = document.createElement('div');
        explanationElement.className = 'bundle-explanation';
        explanationElement.textContent = 'Add items to your bundle and save the percentages shown above on each additional item! Feel free to browse around to find more items, but make sure you build your cart in this bundle section to recognize the discounts.';
        bundleContainer.appendChild(explanationElement);
      }
      
      // Create your bundle section
      const selectedSection = document.createElement('div');
      selectedSection.className = 'bundle-selected-products';
      
      const selectedSectionHeader = document.createElement('h4');
      selectedSectionHeader.className = 'bundle-section-header your-bundle';
      selectedSectionHeader.textContent = 'Your Bundle';
      selectedSection.appendChild(selectedSectionHeader);
      
      // Create slots container
      const slotsContainer = document.createElement('div');
      slotsContainer.className = 'bundle-slots-container';
      
      // Main product slot
      const mainSlot = createProductSlot(
        { 
          id: currentProductId, 
          title: productTitle, 
          price: numericPrice,
          image: productImage,
          variantId: currentVariantId 
        }, 
        1, // Changed from 0 to 1 for position - main product is position 1
        'Main Item',
        bundleConfig
      );
      mainSlot.classList.add('main-product');
      slotsContainer.appendChild(mainSlot);
      
      // Plus sign
      slotsContainer.appendChild(createPlusSign());
      
      // Additional slots based on available discounts
      let slotCount = 0;
      for (let i = 2; i <= 6; i++) { // Changed from 1-5 to 2-6 (position 1 is main product)
        const discountKey = `Item${i-1}Discount`; // Adjusted index to match your config keys
        const discountPercent = bundleConfig[discountKey] || 0;
        
        if (discountPercent > 0) {
          slotCount++;
          const slotTitle = `Item ${i-1}: ${discountPercent}% Off`;
          const slot = createEmptySlot(i, slotTitle, discountPercent);
          
          // Add plus sign before each slot except the first
          if (slotCount > 1) {
            slotsContainer.appendChild(createPlusSign());
          }
          
          slotsContainer.appendChild(slot);
        }
      }
      
      selectedSection.appendChild(slotsContainer);
      bundleContainer.appendChild(selectedSection);
      
      // Create bundle summary
      const summaryElement = createBundleSummary(numericPrice);
      bundleContainer.appendChild(summaryElement);
      
      // Create product catalog section

      if (complementaryProducts && complementaryProducts.length > 0) {
        const catalogSection = document.createElement('div');
        catalogSection.className = 'bundle-product-catalog';
        
        const catalogHeader = document.createElement('h4');
        catalogHeader.className = 'bundle-section-header';
        catalogHeader.textContent = 'Complete Your Bundle';
        catalogSection.appendChild(catalogHeader);
        
        // ADD CATEGORY FILTERING - Extract unique product types
        const productTypes = [];
        const productTypesMap = {};
        
        
        complementaryProducts.forEach(product => {
          // Get product type from product, defaulting to "Uncategorized" if not available
          const productType = product.productType || "Uncategorized";
          if (!productTypesMap[productType]) {
            productTypesMap[productType] = true;
            productTypes.push(productType);
          }
        });
        
        // Sort product types alphabetically
        productTypes.sort();
        
        // Create category filter container
        const categoryFilterContainer = document.createElement('div');
        categoryFilterContainer.className = 'bundle-category-filter';
        
        // Add filter label
        const filterLabel = document.createElement('span');
        filterLabel.className = 'bundle-filter-label';
        filterLabel.textContent = 'Filter by category: ';
        categoryFilterContainer.appendChild(filterLabel);
        
        // Create "All" button (active by default)
        const allButton = document.createElement('button');
        allButton.className = 'bundle-category-btn active';
        allButton.setAttribute('data-category', 'all');
        allButton.textContent = 'All';
        allButton.addEventListener('click', filterProductsByCategory);
        categoryFilterContainer.appendChild(allButton);
        
        // Create button for each product type
        productTypes.forEach(type => {
          const button = document.createElement('button');
          button.className = 'bundle-category-btn';
          button.setAttribute('data-category', type);
          button.textContent = type;
          button.addEventListener('click', filterProductsByCategory);
          categoryFilterContainer.appendChild(button);
        });
        
        // Add category filter to catalog section
        if (productTypes.length > 0) {
          catalogSection.appendChild(categoryFilterContainer);
        }
        
        const productScroll = document.createElement('div');
        productScroll.className = 'bundle-product-scroll';
        productScroll.id = 'bundle-product-scroll';
        
        // Process and add each complementary product
        complementaryProducts.forEach((product, index) => {
          try {
            const productCard = createProductCard(product, index);
            
            // Add product type as a data attribute for filtering
            productCard.setAttribute('data-product-type', product.productType || 'Uncategorized');
            
            productScroll.appendChild(productCard);
          } catch (error) {
            console.error("Error creating product card:", error, product);
          }
        });
        
        catalogSection.appendChild(productScroll);
        
        // Add pagination
        const paginationElement = createPagination(currentPage, totalPages);
        catalogSection.appendChild(paginationElement);
        
        bundleContainer.appendChild(catalogSection);
      }
    }

    /**
 * Create a pagination element
 */
function createPagination(currentPage, totalPages) {
    const paginationContainer = document.createElement('div');
    paginationContainer.className = 'bundle-pagination';
    
    // Only show pagination if we have more than one page
    if (totalPages <= 1) return paginationContainer;
    
    // Add pagination info
    const paginationInfo = document.createElement('div');
    paginationInfo.className = 'bundle-pagination-info';
    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    paginationContainer.appendChild(paginationInfo);
    
    // Add pagination controls
    const paginationControls = document.createElement('div');
    paginationControls.className = 'bundle-pagination-controls';
    
    // Previous button
    const prevButton = document.createElement('button');
    prevButton.className = 'bundle-pagination-btn prev';
    prevButton.textContent = '« Previous';
    prevButton.disabled = currentPage <= 1;
    if (currentPage > 1) {
      prevButton.addEventListener('click', () => changePage(currentPage - 1));
    }
    paginationControls.appendChild(prevButton);
    
    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
      const pageButton = document.createElement('button');
      pageButton.className = `bundle-pagination-btn page ${i === currentPage ? 'active' : ''}`;
      pageButton.textContent = i.toString();
      
      if (i !== currentPage) {
        pageButton.addEventListener('click', () => changePage(i));
      }
      
      paginationControls.appendChild(pageButton);
    }
    
    // Next button
    const nextButton = document.createElement('button');
    nextButton.className = 'bundle-pagination-btn next';
    nextButton.textContent = 'Next »';
    nextButton.disabled = currentPage >= totalPages;
    if (currentPage < totalPages) {
      nextButton.addEventListener('click', () => changePage(currentPage + 1));
    }
    paginationControls.appendChild(nextButton);
    
    paginationContainer.appendChild(paginationControls);
    return paginationContainer;
  }

  /**
 * Change the current page
 */
async function changePage(pageNum) {
    try {
      // Show loading state
      const catalogSection = document.querySelector('.bundle-product-catalog');
      if (!catalogSection) return;
      
      // Add or update loading indicator
      let loadingElement = catalogSection.querySelector('.bundle-loading-pagination');
      if (!loadingElement) {
        loadingElement = document.createElement('div');
        loadingElement.className = 'bundle-loading-pagination';
        loadingElement.textContent = 'Loading products...';
        catalogSection.appendChild(loadingElement);
      }
      
      // Disable pagination buttons
      const paginationButtons = document.querySelectorAll('.bundle-pagination-btn');
      paginationButtons.forEach(btn => btn.disabled = true);
      
      // Fetch products for new page
      const products = await fetchStoreProducts(pageNum);
      
      // Get current active category
      const activeCategory = document.querySelector('.bundle-category-btn.active')?.getAttribute('data-category') || 'all';
      
      // Get product scroll container
      const productScroll = document.getElementById('bundle-product-scroll');
      if (productScroll) {
        // Clear existing products
        productScroll.innerHTML = '';
        
        // Add new products
        products.forEach((product, index) => {
          try {
            const productCard = createProductCard(product, index);
            
            // Add product type for filtering
            const productType = product.productType || 'Uncategorized';
            productCard.setAttribute('data-product-type', productType);
            
            // Hide if doesn't match active filter
            if (activeCategory !== 'all' && productType !== activeCategory) {
              productCard.style.display = 'none';
            }
            
            productScroll.appendChild(productCard);
          } catch (error) {
            console.error("Error creating product card:", error, product);
          }
        });
      }
      
      // Update pagination
      const oldPagination = catalogSection.querySelector('.bundle-pagination');
      if (oldPagination) {
        const newPagination = createPagination(currentPage, totalPages);
        catalogSection.replaceChild(newPagination, oldPagination);
      }
      
      // Remove loading indicator
      if (loadingElement && loadingElement.parentNode) {
        loadingElement.parentNode.removeChild(loadingElement);
      }
      
      // Scroll back to top of catalog
      if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error('Error changing page:', error);
      
      // Show error message
      const catalogSection = document.querySelector('.bundle-product-catalog');
      if (catalogSection) {
        const errorElement = document.createElement('div');
        errorElement.className = 'bundle-error-message';
        errorElement.textContent = 'Error loading products. Please try again.';
        catalogSection.appendChild(errorElement);
        
        // Remove after 3 seconds
        setTimeout(() => {
          if (errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
          }
        }, 3000);
      }
      
      // Re-enable pagination buttons
      const paginationButtons = document.querySelectorAll('.bundle-pagination-btn');
      paginationButtons.forEach(btn => btn.disabled = false);
    }
  }  
    
    /**
     * Filter products by category
     */
    function filterProductsByCategory(event) {
      // Get the selected category
      const category = event.target.getAttribute('data-category');
      
      // Update active button
      const categoryButtons = document.querySelectorAll('.bundle-category-btn');
      categoryButtons.forEach(button => {
        if (button === event.target) {
          button.classList.add('active');
        } else {
          button.classList.remove('active');
        }
      });
      
      // Get all product cards
      const productCards = document.querySelectorAll('.bundle-product-card');
      
      // Apply filtering
      productCards.forEach(card => {
        const cardProductType = card.getAttribute('data-product-type');
        
        if (category === 'all' || cardProductType === category) {
          // Show the card if it matches the category or if 'all' is selected
          card.style.display = '';
        } else {
          // Hide the card if it doesn't match
          card.style.display = 'none';
        }
      });
    }
    
    /**
 * Create a product card for the catalog
 */
function createProductCard(product, index) {
    const card = document.createElement('div');
    card.className = 'bundle-product-card';
    card.setAttribute('data-product-id', product.id);
    card.setAttribute('data-variant-id', product.variantId);
    
    // Set product type for filtering
    if (product.productType) {
      card.setAttribute('data-product-type', product.productType);
    }
    
    // Ensure we have a numeric price
    const numericPrice = ensureNumericPrice(product.price);
    card.setAttribute('data-price', numericPrice);
    card.setAttribute('data-index', index);
    
    // Check if this is a recommended product
    if (product.isRecommended || product.recommendationText) {
      card.classList.add('recommended');
      
      const badge = document.createElement('div');
      badge.className = 'recommended-badge';
      badge.textContent = 'Recommended';
      card.appendChild(badge);
    }
    
    // Product image
    const imageContainer = document.createElement('div');
    imageContainer.className = 'bundle-product-image';
    
    if (product.image) {
      const img = document.createElement('img');
      img.src = product.image;
      img.alt = product.title;
      imageContainer.appendChild(img);
    } else {
      imageContainer.textContent = 'No Image';
    }
    
    card.appendChild(imageContainer);
    
    // Product details
    const details = document.createElement('div');
    details.className = 'bundle-product-details';
    
    const title = document.createElement('h5');
    title.className = 'bundle-product-title';
    title.textContent = product.title;
    details.appendChild(title);
    
    const price = document.createElement('p');
    price.className = 'bundle-product-price';
    price.textContent = `$${numericPrice.toFixed(2)}`;
    details.appendChild(price);
    
    card.appendChild(details);
    
    // Check if product has size options
    if (product.hasSizeOptions && product.sizeOption) {
      const sizeSelector = document.createElement('div');
      sizeSelector.className = 'bundle-size-selector';
      
      // Size selector label
      const sizeLabel = document.createElement('label');
      sizeLabel.className = 'bundle-size-label';
      sizeLabel.textContent = product.sizeOption.name + ':';
      sizeSelector.appendChild(sizeLabel);
      
      // Size options container
      const sizeOptions = document.createElement('div');
      sizeOptions.className = 'bundle-size-options';
      
      // Create a button for each size option
      product.sizeOption.values.forEach(option => {
        const sizeBtn = document.createElement('button');
        sizeBtn.className = 'bundle-size-option';
        sizeBtn.setAttribute('data-variant-id', option.variantId);
        sizeBtn.setAttribute('data-value', option.value);
        sizeBtn.textContent = option.value;
        
        // Mark the default selected size
        if (option.variantId === product.variantId) {
          sizeBtn.classList.add('selected');
        }
        
        // Add event listener to select this size
        sizeBtn.addEventListener('click', (e) => {
          // Update selected class
          sizeOptions.querySelectorAll('.bundle-size-option').forEach(btn => {
            btn.classList.remove('selected');
          });
          sizeBtn.classList.add('selected');
          
          // Update variant ID on the card
          card.setAttribute('data-variant-id', option.variantId);
          
          // Update price if different
          if (option.price && option.price !== numericPrice) {
            price.textContent = `$${option.price.toFixed(2)}`;
            card.setAttribute('data-price', option.price);
          }
          
          e.preventDefault(); // Prevent the event from bubbling up
        });
        
        sizeOptions.appendChild(sizeBtn);
      });
      
      sizeSelector.appendChild(sizeOptions);
      card.appendChild(sizeSelector);
    }
    
    // Add to bundle button
    const button = document.createElement('button');
    button.className = 'bundle-add-to-bundle-btn';
    button.textContent = 'Add to Bundle';
    button.addEventListener('click', () => {
      // Get the currently selected size variant if applicable
      const selectedSize = card.querySelector('.bundle-size-option.selected');
      if (selectedSize) {
        const selectedVariantId = selectedSize.getAttribute('data-variant-id');
        const updatedProduct = {
          ...product,
          variantId: selectedVariantId,
          // Update price if needed
          price: parseFloat(card.getAttribute('data-price'))
        };
        addProductToBundle(updatedProduct);
      } else {
        addProductToBundle(product);
      }
    });
    
    card.appendChild(button);
    
    return card;
  }  
    
    /**
     * Create a product slot for the selected products
     */
    function createProductSlot(product, slotIndex, title, bundleConfig) {
      const slot = document.createElement('div');
      slot.className = 'bundle-product-slot';
      slot.setAttribute('data-slot-index', slotIndex);
      
      // Slot title
      const titleDiv = document.createElement('div');
      titleDiv.className = 'bundle-slot-title';
      
      // Add discount indicator to title if applicable
      if (slotIndex > 1) { // Changed from slotIndex > 0 to slotIndex > 1
        const discountKey = `Item${slotIndex-1}Discount`; // Adjusted index
        const discountPercent = bundleConfig[discountKey] || 0;
        if (discountPercent > 0) {
          titleDiv.classList.add('has-discount');
        }
      }
      
      titleDiv.textContent = title;
      slot.appendChild(titleDiv);
      
      // Slot content
      const content = document.createElement('div');
      content.className = 'bundle-slot-content';
      
      if (product) {
        // Product is provided
        
        // Set data attributes
        slot.setAttribute('data-product-id', product.id);
        slot.setAttribute('data-variant-id', product.variantId);
        const numericPrice = ensureNumericPrice(product.price);
        slot.setAttribute('data-price', numericPrice);
        
        // Image container
        const imageContainer = document.createElement('div');
        imageContainer.className = 'bundle-slot-image';
        
        if (product.image) {
          const img = document.createElement('img');
          img.src = product.image;
          img.alt = product.title;
          imageContainer.appendChild(img);
        } else {
          imageContainer.textContent = 'No Image';
        }
        
        // Add remove button (not for main product)
        if (slotIndex > 1) { // Changed from slotIndex > 0 to slotIndex > 1
          const removeBtn = document.createElement('button');
          removeBtn.className = 'bundle-remove-btn';
          removeBtn.textContent = '×';
          removeBtn.setAttribute('aria-label', 'Remove from bundle');
          removeBtn.addEventListener('click', () => removeFromBundle(slotIndex));
          imageContainer.appendChild(removeBtn);
        }
        
        content.appendChild(imageContainer);
        
        // Product details
        const details = document.createElement('div');
        details.className = 'bundle-slot-details';
        
        const title = document.createElement('h5');
        title.className = 'bundle-slot-product-title';
        title.textContent = product.title;
        details.appendChild(title);
        
        // Price
        const price = document.createElement('p');
        price.className = 'bundle-slot-price';
        
        // Apply discount if applicable
        if (slotIndex > 1) { // Changed from slotIndex > 0 to slotIndex > 1
          const discountKey = `Item${slotIndex-1}Discount`; // Adjusted index
          const discountPercent = bundleConfig[discountKey] || 0;
          
          if (discountPercent > 0) {
            const originalPrice = document.createElement('span');
            originalPrice.className = 'bundle-original-price';
            originalPrice.textContent = `$${numericPrice.toFixed(2)}`;
            price.appendChild(originalPrice);
            
            const discountedPrice = numericPrice * (1 - (discountPercent / 100));
            const discountSpan = document.createElement('span');
            discountSpan.className = 'bundle-discounted-price';
            discountSpan.textContent = `$${discountedPrice.toFixed(2)}`;
            price.appendChild(discountSpan);
          } else {
            price.textContent = `$${numericPrice.toFixed(2)}`;
          }
        } else {
          price.textContent = `$${numericPrice.toFixed(2)}`;
        }
        
        details.appendChild(price);
        content.appendChild(details);
      } else {
        // Empty slot
        content.classList.add('empty');
        
        const placeholder = document.createElement('div');
        placeholder.className = 'bundle-slot-placeholder';
        
        const placeholderText = document.createElement('p');
        placeholderText.textContent = 'Empty Slot';
        placeholder.appendChild(placeholderText);
        
        const hint = document.createElement('p');
        hint.className = 'bundle-slot-hint';
        hint.textContent = 'Select a product below';
        placeholder.appendChild(hint);
        
        content.appendChild(placeholder);
      }
      
      slot.appendChild(content);
      return slot;
    }
    
    /**
     * Create an empty product slot
     */
    function createEmptySlot(slotIndex, title, discountPercent) {
      const slot = document.createElement('div');
      slot.className = 'bundle-product-slot';
      slot.setAttribute('data-slot-index', slotIndex);
      
      // Slot title
      const titleDiv = document.createElement('div');
      titleDiv.className = 'bundle-slot-title';
      if (discountPercent > 0) {
        titleDiv.classList.add('has-discount');
      }
      titleDiv.textContent = title;
      slot.appendChild(titleDiv);
      
      // Empty slot content
      const content = document.createElement('div');
      content.className = 'bundle-slot-content empty';
      
      const placeholder = document.createElement('div');
      placeholder.className = 'bundle-slot-placeholder';
      
      const placeholderText = document.createElement('p');
      placeholderText.textContent = 'Empty Slot';
      placeholder.appendChild(placeholderText);
      
      const hint = document.createElement('p');
      hint.className = 'bundle-slot-hint';
      hint.textContent = 'Select a product below';
      placeholder.appendChild(hint);
      
      content.appendChild(placeholder);
      slot.appendChild(content);
      
      return slot;
    }
    
    /**
     * Create a plus sign element
     */
    function createPlusSign() {
      const plus = document.createElement('div');
      plus.className = 'bundle-slot-plus';
      plus.textContent = '+';
      return plus;
    }
    
    /**
     * Create the bundle summary element
     */
    function createBundleSummary(mainProductPrice) {
      const summary = document.createElement('div');
      summary.className = 'bundle-summary';
      
      const title = document.createElement('h5');
      title.className = 'bundle-summary-title';
      title.textContent = 'Bundle Summary';
      summary.appendChild(title);
      
      // Original total row
      const originalRow = document.createElement('div');
      originalRow.className = 'bundle-summary-row';
      
      const originalLabel = document.createElement('span');
      originalLabel.textContent = 'Original Total:';
      originalRow.appendChild(originalLabel);
      
      const originalTotal = document.createElement('span');
      originalTotal.className = 'bundle-original-total';
      originalTotal.textContent = `$${mainProductPrice.toFixed(2)}`;
      originalRow.appendChild(originalTotal);
      
      summary.appendChild(originalRow);
      
      // Bundle total row
      const bundleRow = document.createElement('div');
      bundleRow.className = 'bundle-summary-row';
      
      const bundleLabel = document.createElement('span');
      bundleLabel.textContent = 'Bundle Total:';
      bundleRow.appendChild(bundleLabel);
      
      const bundleTotal = document.createElement('span');
      bundleTotal.className = 'bundle-discounted-price';
      bundleTotal.textContent = `$${mainProductPrice.toFixed(2)}`;
      bundleRow.appendChild(bundleTotal);
      
      summary.appendChild(bundleRow);
      
      // Savings row
      const savingsRow = document.createElement('div');
      savingsRow.className = 'bundle-summary-row';
      
      const savingsLabel = document.createElement('span');
      savingsLabel.textContent = 'You Save:';
      savingsRow.appendChild(savingsLabel);
      
      const savings = document.createElement('span');
      savings.className = 'bundle-savings';
      savings.textContent = '0%';
      savingsRow.appendChild(savings);
      
      summary.appendChild(savingsRow);
      
      // Add to cart button
      const button = document.createElement('button');
      button.className = 'bundle-add-to-cart-btn';
      button.textContent = `Add to Cart • $${mainProductPrice.toFixed(2)}`;
      button.setAttribute('data-bundle-items', JSON.stringify([{
        variantId: getMainProductVariantId(),
        position: 1,
        quantity: 1
      }]));
      button.addEventListener('click', handleAddToCart);
      
      summary.appendChild(button);
      
      return summary;
    }
    
/**
 * Add a product to the bundle
 */
function addProductToBundle(product) {
    // Ensure we have a product object
    if (!product) {
      console.error("Cannot add null product to bundle");
      return;
    }
    
    // Find the first empty slot
    const slots = bundleContainer.querySelectorAll('.bundle-product-slot:not(.main-product)');
    let targetSlot = null;
    
    for (let i = 0; i < slots.length; i++) {
      if (slots[i].querySelector('.bundle-slot-content.empty')) {
        targetSlot = slots[i];
        break;
      }
    }
    
    if (!targetSlot) {
      console.warn('No empty slots available');
      return;
    }
    
    // Get slot index
    const slotIndex = parseInt(targetSlot.getAttribute('data-slot-index'));
    
    // Get bundle configuration
    const bundleConfig = getBundleConfigFromDOM();
    
    // Process price to ensure it's a number
    const productCopy = {...product};
    productCopy.price = ensureNumericPrice(product.price);
    
    // Get variant ID
    // First look for variant ID directly on the object
    if (!productCopy.variantId) {
      // For backward compatibility, try extracting from product ID
      if (productCopy.id) {
        // Check if ID has a variant part (for new format product IDs)
        if (productCopy.id.includes('-')) {
          productCopy.variantId = productCopy.id.split('-')[1];
        } else {
          productCopy.variantId = productCopy.id.split('/').pop();
        }
      }
    }
    
    // Replace the empty slot with product
    const newSlot = createProductSlot(productCopy, slotIndex, targetSlot.querySelector('.bundle-slot-title').textContent, bundleConfig);
    targetSlot.parentNode.replaceChild(newSlot, targetSlot);
    
    // Update the add button state for this product
    // Use the primary product ID (without variant suffix)
    const primaryProductId = productCopy.productId || productCopy.id.split('-')[0];
    updateAddButtonState(primaryProductId);
    
    // Update bundle summary
    updateBundleSummary();
  }  
    
    /**
     * Remove a product from the bundle
     */
    function removeFromBundle(slotIndex) {
      // Find the slot
      const slot = bundleContainer.querySelector(`.bundle-product-slot[data-slot-index="${slotIndex}"]`);
      if (!slot) return;
      
      // Get product ID to update add button state
      const productId = slot.getAttribute('data-product-id');
      
      // Get bundle configuration
      const bundleConfig = getBundleConfigFromDOM();
      
      // Get slot title
      const slotTitle = slot.querySelector('.bundle-slot-title').textContent;
      
      // Replace with empty slot
      const emptySlot = createEmptySlot(slotIndex, slotTitle, bundleConfig[`Item${slotIndex-1}Discount`] || 0); // Adjusted index
      slot.parentNode.replaceChild(emptySlot, slot);
      
      // Update add button state
      if (productId) {
        updateAddButtonState(productId, true);
      }
      
      // Update bundle summary
      updateBundleSummary();
    }
    
/**
 * Update the add button state for a product
 */
function updateAddButtonState(productId, enableButton = false) {
    // Handle both old and new product ID formats
    // First try exact match
    let productCards = bundleContainer.querySelectorAll(`.bundle-product-card[data-product-id="${productId}"]`);
    
    // If no exact matches and the ID might be in the new format (contains productId and variantId)
    if (productCards.length === 0 && productId.includes('-')) {
      const primaryProductId = productId.split('-')[0];
      productCards = bundleContainer.querySelectorAll(`.bundle-product-card[data-product-id^="${primaryProductId}"]`);
    }
    
    productCards.forEach(card => {
      const button = card.querySelector('.bundle-add-to-bundle-btn');
      if (button) {
        if (enableButton) {
          button.textContent = 'Add to Bundle';
          button.disabled = false;
        } else {
          button.textContent = 'Added to Bundle';
          button.disabled = true;
        }
      }
    });
  }  
    
    /**
     * Update the bundle summary with current selections
     */
    function updateBundleSummary() {
      const summary = bundleContainer.querySelector('.bundle-summary');
      if (!summary) return;
      
      // Get all slots with products
      const productSlots = bundleContainer.querySelectorAll('.bundle-product-slot');
      
      // Calculate totals
      let originalTotal = 0;
      let bundleTotal = 0;
      let bundleItems = [];
      
      productSlots.forEach(slot => {
        // Skip empty slots
        if (slot.querySelector('.bundle-slot-content.empty')) return;
        
        const price = parseFloat(slot.getAttribute('data-price') || 0);
        const slotIndex = parseInt(slot.getAttribute('data-slot-index') || 0);
        const variantId = slot.getAttribute('data-variant-id');
        
        if (variantId) {
          bundleItems.push({
            variantId,
            position: slotIndex,
            quantity: 1
          });
        }
        
        originalTotal += price;
        
        // Apply discount if applicable
        if (slotIndex > 1) { // Changed from slotIndex > 0 to slotIndex > 1
          const bundleConfig = getBundleConfigFromDOM();
          const discountKey = `Item${slotIndex-1}Discount`; // Adjusted index
          const discountPercent = bundleConfig[discountKey] || 0;
          
          if (discountPercent > 0) {
            bundleTotal += price * (1 - (discountPercent / 100));
          } else {
            bundleTotal += price;
          }
        } else {
          // Main product - no discount
          bundleTotal += price;
        }
      });
      
      // Calculate savings percentage
      const savingsPercent = originalTotal > 0 ? ((originalTotal - bundleTotal) / originalTotal) * 100 : 0;
      
      // Update summary values
      summary.querySelector('.bundle-original-total').textContent = `$${originalTotal.toFixed(2)}`;
      summary.querySelector('.bundle-discounted-price').textContent = `$${bundleTotal.toFixed(2)}`;
      summary.querySelector('.bundle-savings').textContent = `${savingsPercent.toFixed(1)}%`;
      
      // Update add to cart button
      const addButton = summary.querySelector('.bundle-add-to-cart-btn');
      if (addButton) {
        addButton.textContent = `Add to Cart • $${bundleTotal.toFixed(2)}`;
        addButton.setAttribute('data-bundle-items', JSON.stringify(bundleItems));
      }
    }
    
    /**
     * Extract bundle configuration from the DOM
     */
    function getBundleConfigFromDOM() {
      const config = {};
      const slots = bundleContainer.querySelectorAll('.bundle-product-slot:not(.main-product)');
      
      slots.forEach(slot => {
        const slotIndex = parseInt(slot.getAttribute('data-slot-index') || 0);
        if (slotIndex > 1) { // Changed from slotIndex > 0 to slotIndex > 1
          const title = slot.querySelector('.bundle-slot-title').textContent;
          // Extract discount percentage from title (e.g., "Item 1: 20% Off")
          const match = title.match(/(\d+)%/);
          if (match && match[1]) {
            config[`Item${slotIndex-1}Discount`] = parseInt(match[1]); // Adjusted index
          }
        }
      });
      
      return config;
    }
    
    /**
     * Get the variant ID of the main product
     */
    function getMainProductVariantId() {
      const mainSlot = bundleContainer.querySelector('.bundle-product-slot.main-product');
      return mainSlot ? mainSlot.getAttribute('data-variant-id') : null;
    }
    
    /**
     * Handle adding the bundle to cart
     */
    async function handleAddToCart(event) {
      event.preventDefault();
      
      const button = event.target;
      const originalText = button.textContent;
      button.textContent = "Creating bundle...";
      button.disabled = true;
      
      try {
        // Get the selected bundle items
        const bundleItems = JSON.parse(button.getAttribute('data-bundle-items') || '[]');
        
        if (bundleItems.length === 0) {
          throw new Error("No items in bundle");
        }
        
        console.log("Adding bundle items:", bundleItems);
        
        // Use the Gadget bundle-cart API instead of direct Shopify cart API
        const response = await gadgetApi.fetch('/bundle-cart', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Shopify-Shop-Domain': shopDomain
            },
            body: JSON.stringify({ 
              bundleItems,
              shop: shopDomain // Include shop explicitly in request body
            })
          });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
          throw new Error(errorData.error || `Failed to add bundle: ${response.status}`);
        }
        
        // Parse response
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || "Failed to create bundle cart");
        }
        
        // Show success message
        button.textContent = "Added to Cart!";
        
        // Create success message
        const successMessage = document.createElement('div');
        successMessage.className = 'bundle-success-message';
        
        if (result.draftOrder && result.draftOrder.checkoutUrl) {
            // Show success message with checkout link
            successMessage.innerHTML = `Your bundle is ready! <a href="${result.draftOrder.checkoutUrl}" class="bundle-checkout-link">Checkout Now</a>`;
            
            // Optionally, add a button that redirects immediately
            const checkoutButton = document.createElement('button');
            checkoutButton.className = 'bundle-checkout-btn';
            checkoutButton.textContent = 'Proceed to Checkout';
            checkoutButton.addEventListener('click', () => {
              window.location.href = result.draftOrder.checkoutUrl;
            });
            successMessage.appendChild(checkoutButton);
          } else {
            successMessage.innerHTML = 'Your bundle has been created! Check your email for checkout instructions.';
          }
        
        // Add success message if not already present
        if (!bundleContainer.querySelector('.bundle-success-message')) {
          bundleContainer.appendChild(successMessage);
        }
        
        // Reset button after delay
        setTimeout(() => {
          button.textContent = originalText;
          button.disabled = false;
        }, 2000);
        
      } catch (error) {
        console.error("Error adding bundle to cart:", error);
        button.textContent = "Error - Try Again";
        button.disabled = false;
        
        // Show error message to user
        const errorMessage = document.createElement('div');
        errorMessage.className = 'bundle-error-message';
        errorMessage.textContent = error.message || "Failed to add bundle to cart. Please try again.";
        
        // Remove existing error messages
        const existingError = bundleContainer.querySelector('.bundle-error-message');
        if (existingError) {
          bundleContainer.removeChild(existingError);
        }
        
        // Add new error message
        bundleContainer.appendChild(errorMessage);
        
        // Remove error message after 5 seconds
        setTimeout(() => {
          const errorMsg = bundleContainer.querySelector('.bundle-error-message');
          if (errorMsg) {
            errorMsg.style.opacity = '0';
            setTimeout(() => {
              if (errorMsg.parentNode) {
                errorMsg.parentNode.removeChild(errorMsg);
              }
            }, 300);
          }
        }, 5000);
      }
    }
  });