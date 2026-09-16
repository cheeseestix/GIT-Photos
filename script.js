// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Create a hidden canvas for color extraction
  const canvas = document.createElement('canvas');
  canvas.id = 'colorExtractorCanvas';
  canvas.style.display = 'none';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Store previous palettes and extraction seeds to ensure new ones are different
  const previousPalettes = new Map();
  const extractionSeeds = new Map();

  // Function to extract dominant colors from an image using canvas
  function extractColorsFromCanvas(img, count = 5) {
    // Set canvas dimensions to match image
    canvas.width = img.naturalWidth || img.width || 100;
    canvas.height = img.naturalHeight || img.height || 100;
    
    // Draw image on canvas (this may fail with CORS)
    try {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    } catch (e) {
      // CORS error - cannot extract colors this way
      return null;
    }
    
    // Get image data
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const totalPixels = data.length / 4;
      
      // Collect all valid (non-transparent) pixels
      const validPixels = [];
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a >= 200) {
          validPixels.push([r, g, b]);
        }
      }
      
      if (validPixels.length < count) return null;
      
      // Get seed for this image to ensure different extractions each time
      const imgSrc = img.src;
      let seed = extractionSeeds.get(imgSrc) || 0;
      seed = (seed + 1) % 1000;
      extractionSeeds.set(imgSrc, seed);
      
      // Use seed-based random selection to get different colors each time
      // Sample from the ENTIRE image (including background) to capture all colors
      const selectedColors = [];
      
      // Strategy: divide image into regions and sample from each
      // This ensures we get colors from different parts of the image
      const regions = count * 2; // More regions than colors needed
      const regionWidth = Math.ceil(canvas.width / regions);
      
      // Use seed to determine starting point for sampling
      const startX = (seed % regions) * regionWidth;
      
      let currentX = startX;
      let attempts = 0;
      const maxAttempts = regions * 3;
      
      while (selectedColors.length < count && attempts < maxAttempts) {
        // Pick a random Y position (full height)
        const randomY = Math.floor(Math.random() * canvas.height);
        const idx = (randomY * canvas.width + currentX) * 4;
        
        // Check bounds and opacity
        if (idx + 2 < data.length && data[idx + 3] >= 200) {
          const color = [data[idx], data[idx + 1], data[idx + 2]];
          
          // Check if this color is too similar to already selected ones
          let isUnique = true;
          for (const selected of selectedColors) {
            const diff = Math.abs(selected[0] - color[0]) + Math.abs(selected[1] - color[1]) + Math.abs(selected[2] - color[2]);
            if (diff < 40) {
              isUnique = false;
              break;
            }
          }
          
          if (isUnique) {
            selectedColors.push(color);
          }
        }
        
        // Move to next region
        currentX = (currentX + regionWidth) % canvas.width;
        attempts++;
      }
      
      // If we still don't have enough unique colors, sample more broadly
      if (selectedColors.length < count) {
        // Try sampling from corners and center for more diversity
        const samplePoints = [
          { x: 0, y: 0 }, // Top-left
          { x: canvas.width - 1, y: 0 }, // Top-right
          { x: 0, y: canvas.height - 1 }, // Bottom-left
          { x: canvas.width - 1, y: canvas.height - 1 }, // Bottom-right
          { x: Math.floor(canvas.width / 2), y: Math.floor(canvas.height / 2) }, // Center
          { x: Math.floor(canvas.width / 4), y: Math.floor(canvas.height / 4) },
          { x: Math.floor(canvas.width * 3/4), y: Math.floor(canvas.height / 4) },
          { x: Math.floor(canvas.width / 4), y: Math.floor(canvas.height * 3/4) },
          { x: Math.floor(canvas.width * 3/4), y: Math.floor(canvas.height * 3/4) }
        ];
        
        for (const point of samplePoints) {
          if (selectedColors.length >= count) break;
          const idx = (point.y * canvas.width + point.x) * 4;
          if (idx + 2 < data.length && data[idx + 3] >= 200) {
            const color = [data[idx], data[idx + 1], data[idx + 2]];
            let isUnique = true;
            for (const selected of selectedColors) {
              const diff = Math.abs(selected[0] - color[0]) + Math.abs(selected[1] - color[1]) + Math.abs(selected[2] - color[2]);
              if (diff < 40) {
                isUnique = false;
                break;
              }
            }
            if (isUnique) {
              selectedColors.push(color);
            }
          }
        }
      }
      
      // If still not enough, pick from validPixels with uniqueness check
      if (selectedColors.length < count) {
        for (let i = 0; i < validPixels.length && selectedColors.length < count; i++) {
          const color = validPixels[i];
          let isUnique = true;
          for (const selected of selectedColors) {
            const diff = Math.abs(selected[0] - color[0]) + Math.abs(selected[1] - color[1]) + Math.abs(selected[2] - color[2]);
            if (diff < 40) {
              isUnique = false;
              break;
            }
          }
          if (isUnique) {
            selectedColors.push(color);
          }
        }
      }
      
      // Last resort: just take first available colors
      if (selectedColors.length < count) {
        for (let i = 0; i < validPixels.length && selectedColors.length < count; i++) {
          selectedColors.push(validPixels[i]);
        }
      }
      
      return selectedColors.length === count ? selectedColors : null;
    } catch (e) {
      return null;
    }
  }

  // Function to extract and display color palette for an image
  function extractAndDisplayColors(imgElement, swatchContainer) {
    const img = imgElement;
    
    // First, make sure the image is loaded
    if (!img.complete || img.naturalWidth === 0) {
      img.addEventListener('load', function() {
        processImageForColors(img, swatchContainer);
      });
      return;
    }
    
    processImageForColors(img, swatchContainer);
  }

  // Process image and try different methods for color extraction
  function processImageForColors(img, swatchContainer) {
    const alt = img.alt.toLowerCase();
    const src = img.src.toLowerCase();
    
    // Method 1: Try canvas extraction on the original image (no CORS)
    let colors = extractColorsFromCanvas(img, 5);
    
    if (colors) {
      // Check if this is different from previous palette for this image
      const prevKey = previousPalettes.get(img.src);
      if (prevKey) {
        let isSame = true;
        for (let i = 0; i < 5; i++) {
          if (colors[i] && prevKey[i]) {
            const c = colors[i].join(',');
            const p = prevKey[i].join(',');
            if (c !== p) {
              isSame = false;
              break;
            }
          }
        }
        if (isSame) {
          // Force a different extraction by incrementing seed and trying again
          const currentSeed = extractionSeeds.get(img.src) || 0;
          extractionSeeds.set(img.src, currentSeed + 1);
          colors = extractColorsFromCanvas(img, 5);
        }
      }
      previousPalettes.set(img.src, colors);
      displayColors(colors, swatchContainer);
      img.setAttribute('data-colors-extracted', 'true');
      return;
    }
    
    // Method 2: Try with Color Thief on original image
    if (typeof ColorThief !== 'undefined') {
      try {
        const colorThief = new ColorThief();
        const quality = Math.floor(Math.random() * 10) + 1; // Random quality 1-10 for more variation
        colors = colorThief.getPalette(img, 5, quality);
        if (colors && colors.length === 5) {
          previousPalettes.set(img.src, colors);
          displayColors(colors, swatchContainer);
          img.setAttribute('data-colors-extracted', 'true');
          return;
        }
      } catch (e) {
        console.log('Color Thief failed:', e);
      }
    }
    
    // Method 3: Try creating a CORS proxy image for color extraction
    tryCorsProxy(img, swatchContainer);
  }

  // Try using a CORS proxy to extract colors
  function tryCorsProxy(img, swatchContainer) {
    // Create a temporary image with CORS enabled
    const corsImg = new Image();
    corsImg.crossOrigin = 'Anonymous';
    corsImg.src = img.src;
    
    let timeout = setTimeout(() => {
      // If CORS image doesn't load within 3 seconds, use fallback with variation
      displayFallbackColorsBasedOnSrc(img, swatchContainer, true);
      img.setAttribute('data-colors-extracted', 'true');
    }, 3000);
    
    corsImg.onload = function() {
      clearTimeout(timeout);
      // Try canvas extraction with CORS image
      let colors = extractColorsFromCanvas(corsImg, 5);
      if (colors) {
        // Check against previous palette
        const prevKey = previousPalettes.get(img.src);
        if (prevKey) {
          let isSame = true;
          for (let i = 0; i < 5; i++) {
            if (colors[i] && prevKey[i]) {
              const c = colors[i].join(',');
              const p = prevKey[i].join(',');
              if (c !== p) {
                isSame = false;
                break;
              }
            }
          }
          if (isSame) {
            const currentSeed = extractionSeeds.get(img.src) || 0;
            extractionSeeds.set(img.src, currentSeed + 1);
            colors = extractColorsFromCanvas(corsImg, 5);
          }
        }
        previousPalettes.set(img.src, colors);
        displayColors(colors, swatchContainer);
        img.setAttribute('data-colors-extracted', 'true');
        return;
      }
      
      // Try Color Thief on CORS image
      if (typeof ColorThief !== 'undefined') {
        try {
          const colorThief = new ColorThief();
          const quality = Math.floor(Math.random() * 10) + 1; // More variation in quality
          colors = colorThief.getPalette(corsImg, 5, quality);
          if (colors && colors.length === 5) {
            previousPalettes.set(img.src, colors);
            displayColors(colors, swatchContainer);
            img.setAttribute('data-colors-extracted', 'true');
            return;
          }
        } catch (e) {
          console.log('Color Thief on CORS failed:', e);
        }
      }
      
      // Use fallback with variation
      displayFallbackColorsBasedOnSrc(img, swatchContainer, true);
      img.setAttribute('data-colors-extracted', 'true');
    };
    
    corsImg.onerror = function() {
      clearTimeout(timeout);
      // CORS failed, use fallback with variation
      displayFallbackColorsBasedOnSrc(img, swatchContainer, true);
      img.setAttribute('data-colors-extracted', 'true');
    };
  }

  // Extract average colors from different regions
  function extractAverageColors(img, count) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.naturalWidth || img.width || 100;
    tempCanvas.height = img.naturalHeight || img.height || 100;
    const tempCtx = tempCanvas.getContext('2d');
    
    try {
      tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
    } catch (e) {
      return null;
    }
    
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    
    const colors = [];
    const regions = count;
    const regionWidth = Math.floor(tempCanvas.width / regions);
    
    for (let r = 0; r < regions; r++) {
      let totalR = 0, totalG = 0, totalB = 0, pixelCount = 0;
      const startX = r * regionWidth;
      const endX = (r + 1) * regionWidth;
      
      for (let x = startX; x < endX && x < tempCanvas.width; x++) {
        for (let y = 0; y < tempCanvas.height; y++) {
          const idx = (y * tempCanvas.width + x) * 4;
          const red = data[idx];
          const green = data[idx + 1];
          const blue = data[idx + 2];
          const alpha = data[idx + 3];
          
          if (alpha > 200) {
            totalR += red;
            totalG += green;
            totalB += blue;
            pixelCount++;
          }
        }
      }
      
      if (pixelCount > 0) {
        colors.push([
          Math.floor(totalR / pixelCount),
          Math.floor(totalG / pixelCount),
          Math.floor(totalB / pixelCount)
        ]);
      }
    }
    
    return colors.length === count ? colors : null;
  }

  // Fallback: generate colors based on image URL/alt text
  function displayFallbackColorsBasedOnSrc(img, container, useRandom = false) {
    const alt = img.alt.toLowerCase();
    const src = img.src.toLowerCase();
    
    let colors = [];
    
    // Define color pools for each category - expanded with more variety
    const dogColors = [
      [210, 180, 140], [139, 69, 19], [255, 255, 255], [0, 0, 0], [210, 160, 100],
      [180, 140, 90], [100, 80, 50], [230, 200, 160], [160, 120, 80], [200, 150, 100],
      [190, 130, 80], [220, 170, 110], [140, 90, 40], [240, 210, 170], [170, 110, 70],
      [250, 200, 150], [120, 85, 45], [160, 110, 60], [200, 140, 80], [150, 100, 50]
    ];
    const catColors = [
      [255, 255, 255], [100, 100, 100], [0, 0, 0], [255, 200, 150], [50, 50, 80],
      [80, 80, 80], [200, 150, 100], [255, 220, 180], [40, 40, 60], [120, 120, 120],
      [60, 60, 90], [140, 140, 140], [220, 180, 140], [30, 30, 50], [90, 90, 110],
      [240, 210, 170], [70, 70, 100], [160, 120, 80], [50, 50, 70], [110, 110, 130]
    ];
    const rabbitColors = [
      [255, 250, 240], [245, 230, 210], [230, 210, 180], [220, 190, 160], [210, 180, 150],
      [255, 248, 235], [240, 225, 205], [235, 215, 190], [225, 200, 170], [215, 195, 170],
      [248, 235, 215], [238, 218, 195], [228, 205, 180], [218, 195, 175], [208, 185, 165],
      [250, 240, 220], [242, 220, 195], [232, 210, 185], [222, 200, 175], [212, 190, 165],
      [245, 235, 210], [235, 220, 195], [225, 210, 185]
    ];
    const snowColors = [
      [255, 255, 255], [240, 240, 240], [200, 200, 200], [150, 150, 150], [100, 150, 200],
      [230, 240, 255], [180, 200, 220], [200, 210, 230], [150, 170, 190], [120, 140, 160],
      [245, 250, 255], [190, 210, 230], [160, 180, 200], [130, 150, 170], [110, 130, 150],
      [220, 230, 240], [170, 190, 210], [140, 160, 180], [100, 120, 140], [80, 100, 120]
    ];
    const defaultColors = [
      [200, 200, 200], [150, 150, 150], [100, 100, 100], [50, 50, 50], [25, 25, 25],
      [180, 180, 180], [120, 120, 120], [80, 80, 80], [40, 40, 40], [10, 10, 10],
      [160, 160, 160], [140, 140, 140], [90, 90, 90], [70, 70, 70], [30, 30, 30],
      [190, 190, 190], [170, 170, 170], [130, 130, 130], [60, 60, 60], [20, 20, 20]
    ];
    
    // Helper to get random selection that's different from previous
    const getRandomColors = (pool, count, imgSrc) => {
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      let selected = shuffled.slice(0, count);
      
      // Check if this is the same as the previous palette for this image
      const prevKey = previousPalettes.get(imgSrc);
      if (prevKey) {
        let isSame = true;
        for (let i = 0; i < count; i++) {
          if (selected[i] && prevKey[i]) {
            const s = selected[i].join(',');
            const p = prevKey[i].join(',');
            if (s !== p) {
              isSame = false;
              break;
            }
          }
        }
        
        // If same, reshuffle and try again (up to 20 times)
        let attempts = 0;
        while (isSame && attempts < 20) {
          const reshuffled = [...pool].sort(() => Math.random() - 0.5);
          selected = reshuffled.slice(0, count);
          
          isSame = true;
          for (let i = 0; i < count; i++) {
            if (selected[i] && prevKey[i]) {
              const s = selected[i].join(',');
              const p = prevKey[i].join(',');
              if (s !== p) {
                isSame = false;
                break;
              }
            }
          }
          attempts++;
        }
      }
      
      // Store this palette for this image
      previousPalettes.set(imgSrc, selected);
      
      return selected;
    };
    
    // Try to infer colors from alt text or URL
    if (alt.includes('dog') || alt.includes('puppy') || src.includes('dog')) {
      colors = useRandom ? getRandomColors(dogColors, 5, img.src) : dogColors.slice(0, 5);
    } else if (alt.includes('cat') || src.includes('cat')) {
      colors = useRandom ? getRandomColors(catColors, 5, img.src) : catColors.slice(0, 5);
    } else if (alt.includes('rabbit') || alt.includes('bunny') || src.includes('rabbit')) {
      colors = useRandom ? getRandomColors(rabbitColors, 5, img.src) : rabbitColors.slice(0, 5);
    } else if (alt.includes('snow') || src.includes('snow')) {
      colors = useRandom ? getRandomColors(snowColors, 5, img.src) : snowColors.slice(0, 5);
    } else {
      colors = useRandom ? getRandomColors(defaultColors, 5, img.src) : defaultColors.slice(0, 5);
    }
    
    displayColors(colors, container);
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
    const refreshBtn = card.querySelector('.refresh-palette');
    
    if (img && swatchContainer && img.getAttribute('data-colors-extracted') === 'false') {
      extractAndDisplayColors(img, swatchContainer);
    }

    // Add click handlers to refresh buttons
    if (refreshBtn) {
      refreshBtn.onclick = (e) => {
        e.stopPropagation();
        if (img) {
          img.setAttribute('data-colors-extracted', 'false');
          extractAndDisplayColors(img, swatchContainer);
        }
      };
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
