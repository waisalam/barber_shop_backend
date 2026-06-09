import { Router } from "express";
import { createShop } from "./controllers/shop.controller.js";
import { getNearbyShops } from "./controllers/getNearbyShops.controller.js";
import { updateShop } from "./controllers/updateShop.controller.js";
import { addShopHours } from "./controllers/addShopHours.controller.js";
import { addService } from "./controllers/addServices.controller.js";

const router = Router();

router.post('/create-shop', createShop)
router.get('/nearby', getNearbyShops)
router.put('/update-shop', updateShop)
router.post('/add-hours', addShopHours)
router.post('/add-service', addService)

export default router



