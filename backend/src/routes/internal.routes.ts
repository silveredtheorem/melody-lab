import { Router } from 'express'
import { prisma } from '../lib/prisma'
import { emitLayerUpdated } from '../lib/socket'

const router = Router()

router.post('/layer-updated', async (req, res) => {
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
