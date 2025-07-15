import { useState } from 'react';

export const useMessage = () => {
  const [message, setMessage] = useState(null);

  const showMessage = (text) => {
    setMessage(text);
  };

  const clearMessage = () => {
    setMessage(null);
  };

  return {
    message,
    showMessage,
    clearMessage,
  };
};