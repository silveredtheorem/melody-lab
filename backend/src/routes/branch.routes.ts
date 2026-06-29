import { Router } from 'express';
import * as branchController from '../controllers/branch.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate';
import { CreateBranchSchema } from '@melody-lab/shared';

const router = Router({ mergeParams: true });

router.use(requireAuth);

router.post('/projects/:projectId/branches', validate(CreateBranchSchema), branchController.createBranch);
router.get('/projects/:projectId/branches', branchController.listBranches);
router.delete('/projects/:projectId/branches/:branchId', branchController.deleteBranch);

export default router;
