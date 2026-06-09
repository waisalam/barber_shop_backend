import { Router } from "express";
import { signup, login, verify } from "./auth/auth.controller.js";
import { updateProfile } from "./controllers/updateProfile.controller.js";
import { refresh } from "./auth/refresh.controller.js";
import { getProfile } from "./auth/getProgile.controller.js";

const router = Router();

router.post('/signup', signup)
router.post('/login', login)
router.post('/verify', verify)
router.put('/profile', updateProfile)
router.get('/profile', getProfile)
router.post('/refresh', refresh)

export default router


