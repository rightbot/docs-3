import fs from 'fs/promises'

import sharp from 'sharp'

import { assetCacheControl, defaultCacheControl } from './cache-control.js'
import { setFastlySurrogateKey, SURROGATE_ENUMS } from './set-fastly-surrogate-key.js'

/**
 * This is the indicator that is a virtual part of the URL.
 * Similar to `/cb-1234/` in asset URLs, it's just there to tell the
 * middleware that the image can be aggressively cached. It's not
 * part of the actual file-on-disk path.
 * Similarly, `/mw-1000/` is virtual and will be observed and removed from
 * the pathname before trying to look it up as disk-on-file.
 * The exact pattern needs to match how it's set in whatever Markdown
 * processing code that might make dynamic asset URLs.
 * So if you change this, make sure you change the code that expects
 * to be able to inject this into the URL.
 */
const maxWidthPathPartRegex = /\/mw-(\d+)\//
/**
 *
 * Why not any free number? If we allowed it to be any integer number
 * someone would put our backend servers at risk by doing something like:
 *
 *    const makeURL = () => `${BASE}/assets/mw-${Math.floor(Math.random()*1000)}/foo.png`
 *    await Promise.all([...Array(10000).keys()].map(makeURL))
 *
 * Which would be lots of distinctly different and valid URLs that the
 * CDN can never really "protect us" on because they're too often distinct.
 *
 * At the moment, the only business need is for 1,000 pixels, so the array
 * only has one. But can change in the future and make this sentence moot.
 */
const VALID_MAX_WIDTHS = [1000]

export default async function dynamicAssets(req, res, next) {
  if (!req.url.startsWith('/assets/')) return next()

  if (!(req.method === 'GET' || req.method === 'HEAD')) {
    return res.status(405).type('text/plain').send('Method Not Allowed')
  }

  // To protect from possible denial of service, we never allow what
  // we're going to do (the image file operation), if the whole thing
  // won't be aggressively cached.
  // If we didn't do this, someone making 2 requests, ...
  //
  //    > GET /assets/images/site/logo.web?random=10476583
  //    > GET /assets/images/site/logo.web?random=20196996
  //
  // ...would be treated as 2 distinct backend requests. Sure, each one
  // would be cached in the CDN, but that's not helping if someone does...
  //
  //    while (true) {
  //       startFetchThread(`/assets/images/site/logo.web?whatever=${rand()}`)
  //    }
  //
  // So we "force" any deviation of the URL to a redirect to the canonical
  // URL (which, again, is heavily cached).
  if (Object.keys(req.query).length > 0) {
    // Cache the 404 so it won't be re-attempted over and over
    defaultCacheControl(res)

    // This redirects to the same URL we're currently on, but with the
    // query string part omitted.
    // For example:
    //
    //    > GET /assets/images/site/logo.web?foo=bar
    //    < 302
    //    < location: /assets/images/site/logo.web
    //
    return res.redirect(302, req.path)
  }

  // From PNG to WEBP, if the PNG exists
  if (req.path.endsWith('.webp')) {
    const { url, maxWidth, error } = deconstructImageURL(req.path)
    if (error) {
      return res.status(400).type('text/plain').send(error.toString())
    }
    try {
      const originalBuffer = await fs.readFile(url.slice(1).replace(/\.webp$/, '.png'))
      const image = sharp(originalBuffer)

      if (maxWidth) {
        const { width } = await image.metadata()
        if (width > maxWidth) {
          image.resize({ width: maxWidth })
        }
      }

      // Note that by default, sharp will use a lossy compression.
      // (i.e. `{lossless: false}` in the options)
      // The difference is that a lossless image is slightly crisper
      // but becomes on average 1.8x larger.
      // Given how we serve images, no human would be able to tell the
      // difference simply by looking at the image as it appears as an
      // image tag in the web page.
      // Also given that rendering-for-viewing is the "end of the line"
      // for the image meaning it just ends up being viewed and not
      // resaved as a source file. If we had intention to overwrite all
      // original PNG source files to WEBP, we should consier lossless
      // to preserve as much quality as possible at the source level.
      // The default quality is 80% which, combined with `lossless:false`
      // makes our images 2.8x smaller than the average PNG.
      const buffer = await image.webp().toBuffer()
      assetCacheControl(res)
      return res.type('image/webp').send(buffer)
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
  }

  // From PNG to AVIF, if the PNG exists
  if (req.path.endsWith('.avif')) {
    const { url, maxWidth, error } = deconstructImageURL(req.path)
    if (error) {
      return res.status(400).type('text/plain').send(error.toString())
    }
    try {
      const originalBuffer = await fs.readFile(url.slice(1).replace(/\.avif$/, '.png'))
      const image = sharp(originalBuffer)

      if (maxWidth) {
        const { width } = await image.metadata()
        if (width > maxWidth) {
          image.resize({ width: maxWidth })
        }
      }
      const buffer = await image
        .avif({
          // The default is 4 (max is 9). Because this is a dynamic thing
          // and AVIF encoding is slow for large images, go for a smaller
          // effort to be sure it can't take too long on a busy server.
          effort: 2,
        })
        .toBuffer()
      assetCacheControl(res)
      return res.type('image/avif').send(buffer)
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error
      }
    }
  }

  // Cache the 404 so it won't be re-attempted over and over
  defaultCacheControl(res)

  // There's a preceeding middleware that sets the Surrogate-Key to
  // "manual-purge" based on the URL possibly having the `/cb-xxxxx/`
  // checksum in it. But, if it failed, we don't want that. So
  // undo that if it was set.
  // It's handy too to not overly cache 404s in the CDN because
  // it could be that the next prod deployment fixes the missing image.
  // For example, a PR landed that introduced the *reference* to the image
  // but forgot to check in the new image, then a follow-up PR adds the image.
  setFastlySurrogateKey(res, SURROGATE_ENUMS.DEFAULT)

  // Don't use something like `next(404)` because we don't want a fancy
  // HTML "Page not found" page response because a failed asset lookup
  // is impossibly a typo in the browser address bar or an accidentally
  // broken link, like it might be to a regular HTML page.
  res.status(404).type('text/plain').send('Asset not found')
}

function deconstructImageURL(url) {
  let error
  let maxWidth
  const match = url.match(maxWidthPathPartRegex)
  if (match) {
    const [whole, number] = match
    maxWidth = parseInt(number)
    if (isNaN(maxWidth) || maxWidth <= 0 || !VALID_MAX_WIDTHS.includes(maxWidth)) {
      error = new Error(`width number (${maxWidth}) is not a valid number`)
    } else {
      url = url.replace(whole, '/')
    }
  }
  return { url, maxWidth, error }
}
