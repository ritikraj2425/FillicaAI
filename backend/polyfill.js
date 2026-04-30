// Polyfills for pdfjs-dist on older Node.js versions (like Vercel Node 20)
// This prevents the "ReferenceError: DOMMatrix is not defined" crash.
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {};
}
if (typeof global.Path2D === 'undefined') {
  global.Path2D = class Path2D {};
}
if (typeof global.ImageData === 'undefined') {
  global.ImageData = class ImageData {};
}
