# Koas Foods website

Built with Vite, GSAP (ScrollTrigger, SplitText, Flip), Lenis and Three.js.

## Run

```
npm install
npm run dev       # development server
npm run build     # production files in dist/
npm run preview   # serve dist/ at http://localhost:4173
```

Pages use absolute paths, so serve the site from a web server at the domain root.
Opening the HTML files directly from disk will not work. Upload the contents of `dist/` to any static host.

## Update the catalogue

`npm run sync` downloads products from the koasfoods.com shop API and rebuilds the images and data.
It depends on the current WordPress site, so export the data before that site is switched off.

## Before launch

- The customer form and "Ask for a quote" links open the visitor's email app. Connect a form service in `src/js/form.js` to receive applications directly.
- Old `/product-category/<slug>/` URLs should redirect to `/assortment/?cat=<slug>` on the host.
