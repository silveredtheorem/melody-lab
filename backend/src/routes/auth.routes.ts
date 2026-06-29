import { Router } from 'express'
import * as authController from '../controllers/auth.controller'
import { validate } from '../middleware/validate'
import { RegisterSchema, LoginSchema } from '@melody-lab/shared/src/schemas/auth.schemas'
import { requireAuth } from '../middleware/auth.middleware'

const router = Router()

router.post('/register', validate(RegisterSchema), authController.register)
router.post('/login', validate(LoginSchema), authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/me', requireAuth, authController.me)
router.patch('/me', requireAuth, authController.updateProfile)
router.post('/change-password', requireAuth, authController.changePassword)

export default router
