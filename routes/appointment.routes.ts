import { Router } from 'express'
import { bookAppointment } from './controllers/bookAppointment.controller.js'
import { updateAppointmentStatus } from './controllers/updateAppointmentStatus.controller.js'
import {getCustomerAppointments} from './controllers/getCustomerAppointment.controller.js'
import {getShopAppointments} from './controllers/getShopAppointments.controller.js'
import {cancelAppointment} from './controllers/cancelAppointment.controller.js'

const router = Router()

router.post('/book', bookAppointment)
router.put('/status', updateAppointmentStatus)
router.post('/customer', getCustomerAppointments)
router.post('/shop', getShopAppointments)
router.put('/cancel', cancelAppointment)

export default router