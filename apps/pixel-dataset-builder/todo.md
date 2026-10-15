# Human Pose Category Extension

## Combined Dataset Export

- [x] Persist uploaded pose photos while navigating between library and Workspace.
- [x] Add combined export across all uploaded pose slots.
- [x] Include category, pose label, source image, dimensions, and every pixel in the combined records.
- [x] Add visible combined export controls and empty-state guidance.
- [x] Verify the combined export build and workflow.

## Metadata-Complete Dataset Contract

- [x] Add dataset-level manifest metadata and schema version.
- [x] Add source-image metadata: file name, MIME type, byte size, dimensions, channel format, and source reference.
- [x] Add pose/category metadata and configurable split/status fields.
- [x] Add complete per-pixel records with x/y, normalized x/y, RGBA, HEX, packed RGB, and pixel index.
- [x] Add full-image export for every pixel, separately from manually sampled records.
- [x] Add visible schema/metadata summary and export controls in Workspace.
- [x] Verify exports and build after the schema expansion.

## Pose-to-Inspector Connection

- [x] Add an action on uploaded pose cards to open the photo in Workspace.
- [x] Pass the selected pose label into the inspector capture workflow.
- [x] Keep the current source image and pixel records synchronized when switching from a pose card.
- [x] Verify upload → open in Workspace → inspect pixel → capture flow.

- [x] Normalize and preserve the five user-defined human pose categories.
- [x] Add category navigation with pose counts and active-category state.
- [x] Add a photo upload slot for every pose.
- [x] Show uploaded thumbnails and allow replacing or removing local photos.
- [x] Keep the existing pixel inspection workflow available from the workspace.
- [x] Verify all pose names are represented and the interface builds successfully.
