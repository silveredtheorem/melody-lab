import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'
import { emitLayerUpdated } from '../lib/socket'

const router = Router()

function requireInternalSecret(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.INTERNAL_SECRET
  if (!secret) return next()
  const provided = req.headers['x-internal-secret']
  if (provided !== secret) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  next()
}

router.post('/layer-updated', requireInternalSecret, async (req, res) => {
  try {
    const { layerId, projectId } = req.body
    const layer = await prisma.layer.findUnique({ where: { id: layerId } })
    if (!layer) {
      return res.status(404).json({ error: 'Layer not found' })
    }
    emitLayerUpdated(projectId, layer)
    res.status(200).json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
