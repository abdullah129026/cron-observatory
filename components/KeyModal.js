"use client";

// API key show-once modal: the raw key appears here and nowhere
// else. Closing by any path (button, Escape, backdrop) calls
// onDone, and the key is then unrecoverable except by revoke plus
// create new.
import Modal from "./Modal.js";
import CopyButton from "./CopyButton.js";

export default function KeyModal({ rawKey, onDone }) {
  return (
    <Modal
      title="Your API key"
      onClose={onDone}
      actions={
        <>
          <button type="button" className="btn" onClick={onDone}>I have copied it</button>
        </>
      }
    >
      <div className="key-row">
        <span style={{ flex: 1 }}>{rawKey}</span>
        <CopyButton text={rawKey} />
      </div>
      <p>This key is shown once. If you lose it, revoke it in Settings and create a new one.</p>
      <p>Closing this box moves on, and the key cannot be shown again.</p>
    </Modal>
  );
}
