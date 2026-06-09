import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

export const getCustomerAppointments = async (req: Request, res: Response) => {
  try {
    const { customerId, status } = req.body

    // 1. Validate
    if (!customerId) {
      return res.status(400).json({ message: 'customerId is required' })
    }

    // 2. Get customer profile
    const customerProfile = await prisma.customerProfile.findUnique({
      where: { userId: customerId as string }
    })

    if (!customerProfile) {
      return res.status(404).json({ message: 'Customer profile not found' })
    }

    // 3. Build filter — optionally filter by status
    const whereClause: any = {
      customerId: customerProfile.id
    }

    if (status) {
      whereClause.status = status  // filter by specific status if provided
    }

    // 4. Get appointments
    const appointments = await prisma.appointment.findMany({
      where: whereClause,
      orderBy: { scheduledAt: 'desc' },  // latest first
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
            address: true,
            city: true
          }
        },
        barber: {
          select: {
            avgRating: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
                profilePictureUrl: true
              }
            }
          }
        },
        review: {
          select: {
            shopRating: true,
            barberRating: true,
            comment: true
          }
        }
      }
    })

    // 5. Separate upcoming and past
    const now = new Date()
    const upcoming = appointments.filter(a =>
      new Date(a.scheduledAt) > now &&
      !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)
    )
    const past = appointments.filter(a =>
      ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(a.status)
    )

    return res.status(200).json({
      message: 'Appointments fetched successfully',
      total: appointments.length,
      upcoming,
      past
    })

  } catch (error) {
    console.error('getCustomerAppointments error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}