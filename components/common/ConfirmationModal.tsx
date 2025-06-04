
import React from 'react';
import Modal from '../Modal'; // Root Modal component
import Button from './Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void; // Also acts as onCancel
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonVariant?: 'primary' | 'secondary' | 'danger';
}

/**
 * A modal for actions requiring user confirmation.
 * Built on top of the generic Modal component.
 *
 * @remarks
 * Used by:
 * - Settings: Confirming data import (overwrite), loading sample data, deleting plate inventory items.
 */
const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonVariant = 'primary',
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="ghost" onClick={onClose}>
            {cancelText}
          </Button>
          <Button variant={confirmButtonVariant} onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      }
    >
      <p className="text-textPrimary whitespace-pre-wrap">{message}</p>
    </Modal>
  );
};

export default ConfirmationModal;
