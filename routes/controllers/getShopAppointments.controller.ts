import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

export const getShopAppointments = async (req: Request, res: Response) => {
  try {
    const { shopId, ownerId, status, date } = req.body

    // 1. Validate
    if (!shopId || !ownerId) {
      return res.status(400).json({ message: 'shopId and ownerId are required' })
    }

    // 2. Check shop belongs to owner
    const shop = await prisma.barberShop.findFirst({
      where: {
        id: shopId as string,
        ownerId: ownerId as string
      }
    })

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found or unauthorized' })
    }

    // 3. Build filter
    const whereClause: any = {
      shopId: shopId as string
    }

    // filter by status if provided
    if (status) {
      whereClause.status = status
    }

    // filter by specific date if provided
    if (date) {
      const startOfDay = new Date(date as string)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date as string)
      endOfDay.setHours(23, 59, 59, 999)

      whereClause.scheduledAt = {
        gte: startOfDay,
        lte: endOfDay
      }
    }

    // 4. Get appointments
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      orderBy: { scheduledAt: 'asc' },  // earliest first for shop view
      include: {
        service: {
          select: {
            name: true,
            price: true,
            durationMinutes: true
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
        },
        customer: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                phoneNumber: true,
                profilePictureUrl: true
              }
            }
          }
        }
      }
    })

    // 5. Group by barber for easy shop management view
    const groupedByBarber = appointments.reduce((acc: any, appointment) => {
      const barberName = `${appointment.barber.user.firstName} ${appointment.barber.user.lastName}`
      if (!acc[barberName]) {
        acc[barberName] = []
      }
      acc[barberName].push(appointment)
      return acc
    }, {})

    return res.status(200).json({
      message: 'Shop appointments fetched successfully',
      total: appointments.length,
      appointments,
      groupedByBarber  // grouped view for shop owner
    })

  } catch (error) {
    console.error('getShopAppointments error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}