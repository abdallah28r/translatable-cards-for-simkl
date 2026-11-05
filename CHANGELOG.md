# Changelog

All notable changes to this project are listed here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [1.5.0] - 2026-11-05

First public release.

### Features
- Card descriptions and genres on Simkl can be translated by any page translator: the browser's built-in "Translate" or translation extensions.
- Automatic right-to-left layout when translated into Arabic, Hebrew, Persian, Urdu, and other RTL languages. "Show original" switches it back.
- Cards keep Simkl's own look: the extension copies Simkl's style rules, including screen-size rules.
- Description size setting (80%–200%) with a Reset button.
- On/off switch that applies instantly to open Simkl tabs.

### Changed
- Renamed to "Translatable Cards for Simkl" and marked as unofficial.
- Simkl's stylesheets are now read from the browser cache instead of being downloaded again.

### Removed
- The "Full description" option. It downloaded each title's page from simkl.com in the background, which added requests to Simkl's servers. Data it had saved is cleaned up automatically after you update.

[1.5.0]: https://github.com/abdallah28r/translatable-cards-for-simkl/releases/tag/v1.5.0
