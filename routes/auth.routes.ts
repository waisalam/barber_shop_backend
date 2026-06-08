import { Router } from "express";
import { signup, login, verify } from "./auth/auth.controller.js";

const router = Router();

router.post('/signup', signup)
router.post('/login', login)
router.post('/verify', verify)

export default router


