import {Router} from "express";
import {createReview} from "./controllers/createReview.controller.js";
import { getShopReviews } from "./controllers/getShopReviews.controller.js";

const router = Router()

router.post('/create', createReview)
router.post('/shop', getShopReviews)

export default router