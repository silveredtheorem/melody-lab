import { Router } from 'express'
import * as authController from '../controllers/auth.controller.js'
import { validate } from '../middleware/validate.js'
import { RegisterSchema, LoginSchema } from '@melody-lab/shared'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

router.post('/register', validate(RegisterSchema), authController.register)
router.post('/login', validate(LoginSchema), authController.login)
router.post('/refresh', authController.refresh)
router.post('/logout', authController.logout)
router.get('/me', requireAuth, authController.me)
router.patch('/me', requireAuth, authController.updateProfile)
router.post('/change-password', requireAuth, authController.changePassword)

export default router
