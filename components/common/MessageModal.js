import React from 'react';

const MessageModal = ({ message, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm relative text-center">
      <p className="text-lg font-semibold mb-4">{message}</p>
      <button
        onClick={onClose}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200"
      >
        OK
      </button>
    </div>
  </div>
);

export default MessageModal;