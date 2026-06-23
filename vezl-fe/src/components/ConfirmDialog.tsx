import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  loading?: boolean;
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, description, loading }: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      classNames={{
        base: "bg-surface-elevated border border-border",
        header: "text-text-primary border-b border-border",
        body: "text-text-secondary",
        footer: "border-t border-border",
      }}
    >
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <p className="text-sm">{description}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" className="text-text-secondary" onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="danger"
            onPress={onConfirm}
            isLoading={loading}
          >
            Confirm
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
