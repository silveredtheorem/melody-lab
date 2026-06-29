import { Router } from 'express'
import * as storageController from '../controllers/storage.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validate, validateQuery } from '../middleware/validate.js'
import { GetUploadUrlSchema, GetPlaybackUrlSchema } from '@melody-lab/shared'

const router = Router()

router.use(requireAuth)

router.post('/upload-url', validate(GetUploadUrlSchema), storageController.getUploadUrl)
router.get('/playback-url', validateQuery(GetPlaybackUrlSchema), storageController.getPlaybackUrl)

export default router
