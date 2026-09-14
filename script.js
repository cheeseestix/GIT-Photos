// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Color Thief
  const colorThief = new ColorThief();

  // Function to extract and display color palette for an image
  function extractAndDisplayColors(imgElement, swatchContainer) {
    const img = imgElement;
    
    // Make sure image is loaded and CORS-friendly
    if (img.complete && img.naturalWidth > 0) {
      try {
        const palette = colorThief.getPalette(img, 5);
        displayColors(palette, swatchContainer);
        img.setAttribute('data-colors-extracted', 'true');
      } catch (e) {
        console.log('Could not extract colors (CORS issue):', e);
        // Fallback: use a default gradient
        displayFallbackColors(swatchContainer);
      }
    } else {
      // Image not loaded yet, wait for it
      img.addEventListener('load', function() {
        try {
          const palette = colorThief.getPalette(img, 5);
          displayColors(palette, swatchContainer);
          img.setAttribute('data-colors-extracted', 'true');
        } catch (e) {
          console.log('Could not extract colors (CORS issue):', e);
          displayFallbackColors(swatchContainer);
        }
      });
    }
  }

  // Display color swatches
  function displayColors(palette, container) {
    container.innerHTML = '';
    palette.forEach(color => {
      const swatch = document.createElement('span');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = `rgb(${color.join(', ')})`;
      swatch.title = `RGB: ${color.join(', ')}`;
      container.appendChild(swatch);
    });
  }

  // Fallback colors when CORS prevents extraction
  function displayFallbackColors(container) {
    const fallbackColors = [
      [200, 200, 200], [150, 150, 150], [100, 100, 100], [50, 50, 50], [25, 25, 25]
    ];
    displayColors(fallbackColors, container);
  }

  // Create modal elements
  const modal = document.createElement('div');
  modal.id = 'imageModal';
  modal.style.cssText = `
    display: none;
    position: fixed;
    z-index: 1000;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.9);
    justify-content: center;
    align-items: center;
    flex-direction: column;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.textAlign = 'center';
  
  const modalImg = document.createElement('img');
  modalImg.id = 'modalImage';
  modalImg.style.maxWidth = '80%';
  modalImg.style.maxHeight = '70vh';
  modalImg.style.borderRadius = '8px';
  modalContent.appendChild(modalImg);

  const modalText = document.createElement('div');
  modalText.id = 'modalText';
  modalText.style.color = 'white';
  modalText.style.marginTop = '20px';
  modalText.style.fontSize = '1.5rem';
  modalText.style.padding = '0 20px';
  modalContent.appendChild(modalText);
  
  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  // Close modal only when clicking on the background (not the content)
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  };

  // Process all cards for color extraction
  document.querySelectorAll('.card').forEach(card => {
    const img = card.querySelector('img');
    const swatchContainer = card.querySelector('.color-swatches');
    
    if (img && swatchContainer && img.getAttribute('data-colors-extracted') === 'false') {
      extractAndDisplayColors(img, swatchContainer);
    }

    // Add click handlers to all cards
    card.style.cursor = 'pointer';
    card.onclick = (e) => {
      e.stopPropagation();
      const img = card.querySelector('img');
      const description = card.querySelector('h3');
      
      modalImg.src = img.src;
      modalImg.alt = img.alt;
      modalText.textContent = description.textContent;
      
      modal.style.display = 'flex';
    };
  });
});
