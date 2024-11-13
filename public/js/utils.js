// utils.js
export const updateDateTime = () => {
  const now = new Date();
  const date = now.toLocaleDateString();
  const time = now.toLocaleTimeString();
  document.getElementById('current-date').textContent = date;
  document.getElementById('current-time').textContent = time;
};
