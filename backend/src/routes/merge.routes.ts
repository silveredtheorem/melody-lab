import { Router } from 'express'
import * as mergeController from '../controllers/merge.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validate.js'
import { CreateMergeRequestSchema, ResolveConflictSchema } from '@melody-lab/shared'

const router = Router({ mergeParams: true })

router.use(requireAuth)

router.post('/', validate(CreateMergeRequestSchema), mergeController.createMergeRequest)
router.get('/:mergeRequestId', mergeController.getMergeRequest)
router.patch('/:mergeRequestId/conflicts/:conflictId', validate(ResolveConflictSchema), mergeController.resolveConflict)
router.post('/:mergeRequestId/complete', mergeController.completeMerge)

export default router
