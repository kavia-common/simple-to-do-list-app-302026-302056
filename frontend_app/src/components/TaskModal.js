import React, { useEffect, useMemo, useState } from "react";

/**
 * A controlled modal used for both adding and editing tasks.
 * This is intentionally dependency-free to keep the template lightweight.
 */

// PUBLIC_INTERFACE
export default function TaskModal({
  open,
  mode, // "add" | "edit"
  initialTask,
  onClose,
  onSubmit,
  busy = false,
  error = null,
}) {
  /** Task add/edit modal. */
  const initial = useMemo(() => {
    return {
      title: initialTask?.title || "",
      description: initialTask?.description || "",
      status: initialTask?.status || "pending",
    };
  }, [initialTask]);

  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [status, setStatus] = useState(initial.status);

  useEffect(() => {
    if (!open) return;
    setTitle(initial.title);
    setDescription(initial.description);
    setStatus(initial.status);
  }, [open, initial]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const submitDisabled = busy || title.trim().length === 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (submitDisabled) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      status,
    });
  };

  return (
    <div className="modalOverlay" role="presentation" onMouseDown={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <div className="modalTitleWrap">
            <h2 id="task-modal-title" className="modalTitle">
              {mode === "edit" ? "Edit task" : "Add new task"}
            </h2>
            <p className="modalSubtitle">
              {mode === "edit"
                ? "Update the details or status."
                : "Capture what you need to do next."}
            </p>
          </div>

          <button className="iconButton" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {error ? (
          <div className="inlineError" role="alert">
            <strong>Couldn’t save.</strong> {error}
          </div>
        ) : null}

        <form className="form" onSubmit={handleSubmit}>
          <label className="label">
            Title <span className="required">*</span>
            <input
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Buy groceries"
              autoFocus
              maxLength={120}
            />
          </label>

          <label className="label">
            Description
            <textarea
              className="textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
              rows={4}
              maxLength={1000}
            />
          </label>

          <div className="row">
            <label className="label">
              Status
              <select
                className="select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </label>
          </div>

          <div className="modalFooter">
            <button
              type="button"
              className="btn btnSecondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>

            <button type="submit" className="btn btnPrimary" disabled={submitDisabled}>
              {busy ? "Saving..." : mode === "edit" ? "Save changes" : "Add task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
