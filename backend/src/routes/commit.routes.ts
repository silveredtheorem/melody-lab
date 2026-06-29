import { Router } from 'express';
import * as commitController from '../controllers/commit.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { CreateCommitSchema } from '@melody-lab/shared';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post('/projects/:projectId/commits', validate(CreateCommitSchema), commitController.createCommit);
router.get('/projects/:projectId/commits/history/:branchId', commitController.getCommitHistory);
router.get('/projects/:projectId/commits/:commitId', commitController.getCommit);

export default router;
