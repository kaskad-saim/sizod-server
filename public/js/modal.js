// modal.js
export const openModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('enabled');
  }
};

export const closeModal = (modalId) => {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('enabled');
  }
};

// Обработчики событий для открытия и закрытия модальных окон
export const setupModalHandlers = () => {
  document.querySelectorAll('.modal-btn').forEach((button) => {
    button.addEventListener('click', function () {
      const modalId = this.getAttribute('data-modal-target');
      openModal(modalId);
    });
  });

  document.querySelectorAll('.mnemo__modal-close').forEach((closeButton) => {
    closeButton.addEventListener('click', function () {
      const modal = this.closest('.mnemo__modal-background');
      if (modal) {
        closeModal(modal.id);
      }
    });
  });
};
