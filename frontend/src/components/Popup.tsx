import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface PopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title: string;
  placeholder?: string;
  isConfirmation?: boolean;
  confirmationMessage?: string;
  confirmText?: string;
  cancelText?: string;
}

const Popup: React.FC<PopupProps> = ({
  isOpen,
  onClose,
  onSubmit,
  title,
  placeholder,
  isConfirmation = false,
  confirmationMessage,
  confirmText,
  cancelText
}) => {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmation || inputValue.trim()) {
      onSubmit(isConfirmation ? 'yes' : inputValue);
      setInputValue('');
    }
  };

  const handleClose = () => {
    setInputValue('');
    onClose();
  };

  const handleCancel = () => {
    if (isConfirmation) {
      onSubmit('no');
    }
    handleClose();
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
            {isConfirmation ? (
              <p>{confirmationMessage}</p>
            ) : (
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={placeholder}
                autoFocus
              />
            )}
          </div>
          <div className="popup-actions">
            <button type="button" className="cancel-button" onClick={handleCancel}>
              {cancelText || t('popup.cancel')}
            </button>
            <button type="submit" className="submit-button">
              {confirmText || t('popup.confirm')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Popup;
