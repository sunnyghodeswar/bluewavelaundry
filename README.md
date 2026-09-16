# Blue Wave Laundry — Website

Static single-page site. No build step, no dependencies to install.

## Files

- `index.html` — the site
- `support.js`, `image-slot.js` — runtime scripts the page loads
- `*.png`, `*.jpg` — images

All paths are relative, so the folder works from any subdirectory.

## Deploy to GitHub Pages

1. Create a new repository on GitHub.
2. Upload the **contents** of this folder to the repository root (so `index.html` sits at the top level, not inside a `deploy/` folder).
3. In the repo, go to **Settings → Pages**.
4. Under **Source**, choose `Deploy from a branch`, pick branch `main` and folder `/ (root)`, then Save.
5. Wait about a minute. Your site will be live at `https://<username>.github.io/<repo-name>/`.

## Deploy to Netlify or Vercel

Drag this folder onto the Netlify dashboard, or import the repo in Vercel. No build command; the publish directory is the folder root.

## Custom domain

Add a file named `CNAME` at the repo root containing just your domain (e.g. `bluewavelaundry.in`), then point an `A`/`CNAME` DNS record at your host as their docs describe.

## Editing content later

Phone number, WhatsApp link, prices and copy are all plain text inside `index.html`. Search for the value you want to change.
