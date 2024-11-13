// Пути к вашим изображениям
const animatedGif = 'img/true.gif';
const staticImage = 'img/false.png';

// Функция для обновления состояния GIF
export const updateGifStatus = (lineStatusValue) => {
  const gifElement = document.querySelector('.mnemo__img');

  if (lineStatusValue === 1) {
    gifElement.src = animatedGif;
  } else {
    gifElement.src = staticImage;
  }
};
