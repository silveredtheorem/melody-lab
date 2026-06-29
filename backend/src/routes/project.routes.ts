import { Router } from 'express';
import * as projectController from '../controllers/project.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.js';
import { CreateProjectSchema } from '@melody-lab/shared';

const router = Router();

router.use(requireAuth);

router.post('/', validate(CreateProjectSchema), projectController.createProject);
router.get('/', projectController.listProjects);
router.get('/:projectId', projectController.getProject);

export default router;
