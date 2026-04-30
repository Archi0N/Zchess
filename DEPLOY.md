# Publish Zchess Online

Zchess is a static website. Anyone can play it if these files are hosted publicly:

- `index.html`
- `styles.css`
- `script.js`

## Option 1: GitHub Pages

1. Create a GitHub repository named `Zchess`.
2. Upload all files from this folder.
3. Go to repository **Settings → Pages**.
4. Under **Build and deployment**, choose:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. GitHub will give a public link like:

```text
https://your-username.github.io/Zchess/
```

## Option 2: Netlify Drop

1. Go to:

```text
https://app.netlify.com/drop
```

2. Drag this whole `newZchess` folder into the page.
3. Netlify gives you a public playable link instantly.

## Option 3: Any Web Server

Upload these files to any public server folder:

```text
index.html
styles.css
script.js
README.md
```

Then open the public URL in a browser.
