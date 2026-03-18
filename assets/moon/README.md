# Scientific Moon Assets

This folder contains lunar assets used by the current host application.

## Files

- `lroc_color_2k.jpg`
  Lunar color or albedo texture used for runtime Moon rendering.
- `ldem_3_8bit.jpg`
  Lunar relief-related grayscale texture used in the current rendering pipeline.
- `nasa_svs_4720.json`
  Local metadata payload associated with the source package.

## Source context

These assets come from NASA SVS CGI Moon Kit material associated with SVS 4720.
Keep source context and attribution when redistributing or replacing them.

## Architecture note

These files are runtime assets for the host app rendering layer.
They are not part of the neutral astronomy engine API.

## Maintenance rule

If you replace or upgrade these assets:

- keep the file purpose documented here
- update `README.md` if attribution or usage changes
- verify that rendering behavior still matches `docs/moon-rendering-spec.md`
