## Build

Run `ng build webfinger` to build the project. The build artifacts will be stored in the `dist/` directory.

## Publishing

1. Bump up the version in `projects/webpack/package.json` when changes are done.
1. Add a scetion to `CHANGELOG.md`.
2. Build the library and artifacts using the npm script `npm run package`.
3. Go to the dist folder `cd dist/webfinger` and run `npm publish`.
4. Consider updating the gh-pages example probject running `npm run publish-gh-pages`
