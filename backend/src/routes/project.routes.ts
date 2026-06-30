import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { CreateProjectSchema, AddMemberSchema } from '@melody-lab/shared';

const router = Router();

router.use(requireAuth);

router.post('/', validate(CreateProjectSchema), projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/:projectId', projectController.getProject);
router.post('/:projectId/members', validate(AddMemberSchema), projectController.addMember);
router.delete('/:projectId/members/:userId', projectController.removeMember);

export default router;
