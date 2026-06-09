import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

export const bookAppointment = async (req: Request, res: Response) => {
  try {
    const {
      customerId,   // customer user id
      barberId,     // barber profile id
      shopId,
      serviceId,
      scheduledAt   // "2024-06-15T10:00:00.000Z"
    } = req.body

    // 1. Validate fields
    if (!customerId || !barberId || !shopId || !serviceId || !scheduledAt) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // 2. Get customer profile
    const customerProfile = await prisma.customerProfile.findUnique({
      where: { userId: customerId }
    })

    if (!customerProfile) {
      return res.status(404).json({ message: 'Customer profile not found' })
    }

    // 3. Check shop exists and is active
    const shop = await prisma.barberShop.findFirst({
      where: {
        id: shopId,
        status: 'ACTIVE',
        isOpen: true
      }
    })

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found or not active' })
    }

    // 4. Check barber exists and is available
    const barber = await prisma.barberProfile.findFirst({
      where: {
        id: barberId,
        shopId,
        isAvailable: true
      }
    })

    if (!barber) {
      return res.status(404).json({ message: 'Barber not found or not available' })
    }

    // 5. Get service details — need price and duration
    const service = await prisma.service.findFirst({
      where: {
        id: serviceId,
        shopId,
        isActive: true
      }
    })

    if (!service) {
      return res.status(404).json({ message: 'Service not found or not active' })
    }

    // 6. Check if scheduled time is in the future
    const appointmentTime = new Date(scheduledAt)
    if (appointmentTime < new Date()) {
      return res.status(400).json({ message: 'Appointment time must be in the future' })
    }

    // 7. Check barber has no overlapping appointment at same time
    const appointmentEnd = new Date(
      appointmentTime.getTime() + service.durationMinutes * 60 * 1000
    )

    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        barberId,
        status: { in: ['PENDING', 'CONFIRMED', 'IN_PROGRESS'] },
        AND: [
          { scheduledAt: { lt: appointmentEnd } },
          {
            // existing appointment end time > new appointment start
            scheduledAt: {
              gte: new Date(
                appointmentTime.getTime() - service.durationMinutes * 60 * 1000
              )
            }
          }
        ]
      }
    })

    if (conflictingAppointment) {
      return res.status(409).json({ message: 'Barber already has an appointment at this time' })
    }

    // 8. Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        customerId: customerProfile.id,
        barberId,
        shopId,
        serviceId,
        scheduledAt: appointmentTime,
        durationMinutes: service.durationMinutes,
        priceAtBooking: service.price,  // save price at time of booking
        status: 'PENDING'
      },
      include: {
        service: {
          select: {
            name: true,
            price: true,
            durationMinutes: true
          }
        },
        shop: {
          select: {
            shopName: true,
            address: true
          }
        },
        barber: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    return res.status(201).json({
      message: 'Appointment booked successfully',
      appointment
    })

  } catch (error) {
    console.error('bookAppointment error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}