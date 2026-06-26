import { Router } from 'express';
import * as commitController from '../controllers/commit.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { CreateCommitSchema } from '@melody-lab/shared';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post('/projects/:projectId/commits', validate(CreateCommitSchema), commitController.createCommit);
router.get('/projects/:projectId/commits/history/:branchId', commitController.getCommitHistory);

export default router;
