// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
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

  // Add click handlers to all cards
  document.querySelectorAll('.card').forEach(card => {
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
