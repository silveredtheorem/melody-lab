import { Router } from 'express'
import * as aiController from '../controllers/ai.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.js'
import { AIGenerationSchema } from '@melody-lab/shared'

const router = Router({ mergeParams: true })

router.use(requireAuth)

router.post('/generate', validate(AIGenerationSchema), aiController.requestGeneration)

export default router
