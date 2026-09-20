# Footprint Lab — Photo Edition

Put an original Bitfoot pixel head over a photo, adjust its size and position, then download a PNG. The editor runs entirely in the browser; personal photos are not uploaded to the site.

On touch screens, drag the head to move it, pinch to resize, and twist to rotate. The yellow handles also allow one-finger resizing and rotation. The optional background repair brush copies a nearby clean area over small hair edges; it includes one-stroke undo and works locally in the browser.

The black-and-white switch affects the entire final image, including the Bitfoot head.

This is a static site. Serve `dist/` locally to preview it, or deploy the repository to Vercel. `vercel.json` publishes `dist/` without a build step.

The 18 source head PNGs are kept at the repository root. Their copies under `dist/assets/heads/` are used by the editor.
