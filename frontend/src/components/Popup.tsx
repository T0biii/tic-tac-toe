import React, { useState } from 'react';

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  placeholder?: string;
}

const Popup: React.FC<PopupProps> = ({ isOpen, onClose, onSubmit, title, placeholder = 'Bitte eingeben' }) => {
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSubmit(inputValue);
      setInputValue('');
    }
  };

  const handleClose = () => {
    setInputValue('');
    onClose();
  };

  return (
    <div className="popup-overlay">
      <div className="popup-container">
        <div className="popup-header">
          <h3>{title}</h3>
          <button className="close-button" onClick={handleClose}>
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="popup-content">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              autoFocus
            />
          </div>
          <div className="popup-actions">
            <button type="button" className="cancel-button" onClick={handleClose}>
              Abbrechen
            </button>
            <button type="submit" className="submit-button">
              Bestätigen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Popup;
