// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Modal for enlarged image view
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

  const modalImg = document.createElement('img');
  modalImg.id = 'modalImage';
  modalImg.style.maxWidth = '80%';
  modalImg.style.maxHeight = '70%';
  modalImg.style.borderRadius = '8px';
  modal.appendChild(modalImg);

  const modalText = document.createElement('div');
  modalText.id = 'modalText';
  modalText.style.color = 'white';
  modalText.style.marginTop = '20px';
  modalText.style.fontSize = '1.5rem';
  modalText.style.textAlign = 'center';
  modalText.style.padding = '0 20px';
  modal.appendChild(modalText);

  document.body.appendChild(modal);

  // Close modal when clicking
  modal.onclick = () => {
    modal.style.display = 'none';
  };

  // Add click handlers to all cards
  document.querySelectorAll('.card').forEach(card => {
    card.onclick = () => {
      const img = card.querySelector('img');
      const description = card.querySelector('h3');
      
      modalImg.src = img.src;
      modalImg.alt = img.alt;
      modalText.textContent = description.textContent;
      
      modal.style.display = 'flex';
    };
  });
});
