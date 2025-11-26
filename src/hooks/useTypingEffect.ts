import { useState, useEffect } from 'react';

interface UseTypingEffectOptions {
  text: string;
  speed?: number; // typing speed in ms
  deleteSpeed?: number; // backspace speed in ms
  pauseTime?: number; // pause time after completing text in ms
  pauseAfterDelete?: number; // pause time after deleting in ms
}

export const useTypingEffect = ({
  text,
  speed = 100,
  deleteSpeed = 50,
  pauseTime = 2000,
  pauseAfterDelete = 500,
}: UseTypingEffectOptions) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (!isDeleting) {
      // Typing forward
      if (currentIndex < text.length) {
        timeout = setTimeout(() => {
          setDisplayedText(text.slice(0, currentIndex + 1));
          setCurrentIndex(currentIndex + 1);
        }, speed);
      } else {
        // Finished typing, wait then start deleting
        timeout = setTimeout(() => {
          setIsDeleting(true);
        }, pauseTime);
      }
    } else {
      // Deleting backward
      if (currentIndex > 0) {
        timeout = setTimeout(() => {
          setDisplayedText(text.slice(0, currentIndex - 1));
          setCurrentIndex(currentIndex - 1);
        }, deleteSpeed);
      } else {
        // Finished deleting, wait then start typing again
        timeout = setTimeout(() => {
          setIsDeleting(false);
        }, pauseAfterDelete);
      }
    }

    return () => clearTimeout(timeout);
  }, [currentIndex, isDeleting, text, speed, deleteSpeed, pauseTime, pauseAfterDelete]);

  return displayedText;
};

