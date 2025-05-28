
import React from 'react';
import Modal from '../Modal'; // Root Modal component
import Button from './Button';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

/**
 * A simple modal for displaying alert messages to the user.
 * Built on top of the generic Modal component.
 *
 * @remarks
 * Used by:
 * - Gift Assistant: For AI responses, success/error messages for clipboard copy, form validation.
 * - Settings: For export/import success/failure messages, API key status info, plate inventory validation.
 */
const AlertModal: React.FC<AlertModalProps> = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end">
          <Button onClick={onClose}>OK</Button>
        </div>
      }
    >
      <p className="text-textPrimary whitespace-pre-wrap">{message}</p>
    </Modal>
  );
};

export default AlertModal;
