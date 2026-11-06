# Translatable Cards for Simkl

A small Chrome extension that makes the **descriptions and genres** on [Simkl](https://simkl.com)'s Card view translatable by **any page translator**: your browser's built-in "Translate" or a translation extension.

## Demo

https://github.com/user-attachments/assets/c0c728ea-4ff9-4939-b183-691fd3c38122

## Why?

Simkl draws the description and genres on its cards with CSS. Page translators (the browser's "Translate this page" or translation extensions) can't see CSS text, so those parts stay in English while the rest of the page is translated.

This extension copies that text into normal page text, so it gets translated like everything else.

## Features

- **Translatable descriptions and genres** on Simkl's Card view.
- **Right-to-left support.** When you translate into Arabic, Hebrew, Persian, Urdu, and other RTL languages, the text switches to right-to-left automatically. "Show original" switches it back.
- **Looks the same as Simkl.** It copies Simkl's own styles (size, color, spacing, screen sizes).
- **Adjustable description size** from 80% to 200%.
- **On/off switch** that works instantly, with no page reload.

## Install

The extension is not on the Chrome Web Store yet. You can install it in about a minute:

1. **Download** the latest `.zip` from the [Releases page](https://github.com/abdallah28r/translatable-cards-for-simkl/releases/latest).
2. **Unzip** it to a folder you will keep. Don't delete this folder later, or the extension will stop working.
3. Open Chrome and go to **`chrome://extensions`**.
4. Turn on **Developer mode** (top-right corner).
5. Click **Load unpacked** and select the unzipped folder (the one that contains `manifest.json`).
6. Open or reload [simkl.com](https://simkl.com), switch a list to **Card view**, then translate the page: right-click and choose **Translate to …**, or use your translation extension.

Works in Chrome and other Chromium browsers (Edge, Brave, Opera, Vivaldi). In Edge, go to `edge://extensions` instead.

### Update to a new version

1. Download and unzip the new version **into the same folder** (replace the old files).
2. Go to `chrome://extensions` and click the reload icon ↻ on the extension.
3. Reload your Simkl tab.

### Uninstall

Go to `chrome://extensions` and click **Remove** on the extension.

## Settings

Click the extension icon in the toolbar:

| Setting | What it does |
|---|---|
| **On / Off** | Turns the extension on or off right away. |
| **Description size** | Makes card descriptions 80%–200% of Simkl's normal size. **Reset** goes back to 100%. |

## Privacy

- Collects **no data**, and sends **nothing** to the developer or anyone else.
- No analytics, no tracking, no ads, no remote code.
- Only one permission: **`storage`**, to remember your two settings on your own device.
- Runs only on `simkl.com`.
- Makes **no extra requests** to Simkl's servers. It only works with what the page has already loaded.

Translation itself is done by the translator you choose (your browser's built-in one or a translation extension), under that tool's own privacy policy. This extension doesn't send anything to it.

## How it works (for developers)

Simkl shows card text with CSS such as `content: var(--description)`.
The extension:

1. Finds which CSS variable each card's `::before` / `::after` shows.
2. Puts the same text into real `<span>` elements and hides the CSS copy.
3. Copies Simkl's matching style rules (including media queries) onto those spans, so nothing looks different.
4. Watches for translation changes and sets each line's direction (`rtl` / `ltr`) from its translated text.

Everything is plain JavaScript: no build step and no dependencies. Files:

```
manifest.json   Extension settings (Manifest V3)
content.js      Runs on simkl.com and does the work
popup.html/js   The settings window
icons/          Extension icons
```

## Limitations

- Only the **Card view** descriptions and genres are affected. Other parts of Simkl are already translatable.
- Simkl lists show a **shortened** description (about 300 characters). The extension shows the same text Simkl gives the page; it doesn't download more.
- If Simkl changes its website, the extension may stop working until it's updated. Please [open an issue](https://github.com/abdallah28r/translatable-cards-for-simkl/issues).

## Contributing

Bug reports and pull requests are welcome. Please keep the extension free of tracking and of extra requests to Simkl's servers.

## License

[MIT](LICENSE) © abdallah28r

This project was written with help from AI tools and reviewed by the author.

> **Unofficial.** This project is not made, endorsed, or supported by Simkl. "Simkl" is a trademark of its owner.
