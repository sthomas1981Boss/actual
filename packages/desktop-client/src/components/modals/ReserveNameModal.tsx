import { ModalHeader, ModalTitle } from '#components/common/Modal';
import type { Modal } from '#modals/modalsSlice';

import { SingleInputModal } from './SingleInputModal';

type ReserveNameModalProps = Extract<
  Modal,
  { name: 'reserve-name' }
>['options'];

// One modal for creating and for renaming: the gesture is the same — name a
// provision — and the caller supplies the wording.
export function ReserveNameModal({
  title,
  buttonText,
  placeholder,
  defaultValue,
  onValidate,
  onSubmit,
}: ReserveNameModalProps) {
  return (
    <SingleInputModal
      name="reserve-name"
      Header={props => (
        <ModalHeader
          {...props}
          title={<ModalTitle title={title} shrinkOnOverflow />}
        />
      )}
      inputPlaceholder={placeholder}
      buttonText={buttonText}
      defaultValue={defaultValue}
      onValidate={onValidate}
      onSubmit={onSubmit}
    />
  );
}
