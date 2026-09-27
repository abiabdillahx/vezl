import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button } from "@heroui/react";
import { modalClassNames, secondaryButtonClass } from "./styles";

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
      classNames={modalClassNames}
    >
      <ModalContent>
        <ModalHeader>{title}</ModalHeader>
        <ModalBody>
          <p className="text-[15px] leading-relaxed">{description}</p>
        </ModalBody>
        <ModalFooter>
          <Button className={secondaryButtonClass} onPress={onClose}>
            Cancel
          </Button>
          <Button
            color="danger"
            className="font-medium"
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
