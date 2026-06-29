import { Router } from 'express'
import * as aiController from '../controllers/ai.controller'
import { requireAuth } from '../middleware/auth.middleware'
import { validate } from '../middleware/validate'
import { AIGenerationSchema } from '@melody-lab/shared'

const router = Router({ mergeParams: true })

router.use(requireAuth)

router.post('/generate', validate(AIGenerationSchema), aiController.requestGeneration)

export default router
