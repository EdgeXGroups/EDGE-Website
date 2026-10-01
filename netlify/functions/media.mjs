// Serves images uploaded from /admin (stored in Netlify Blobs).
// Keys are unique per upload, so they can be cached forever.
import { getStore } from '@netlify/blobs'

export default async (req) => {
  const key = decodeURIComponent(new URL(req.url).pathname.replace(/^\/media\//, ''))
  const res = await getStore('media').getWithMetadata(key, { type: 'arrayBuffer' })
  if (!res) return new Response('Not found', { status: 404 })
  return new Response(res.data, {
    headers: {
      'content-type': res.metadata?.type || 'application/octet-stream',
      'cache-control': 'public, max-age=31536000, immutable',
    },
  })
}

export const config = { path: '/media/*' }
