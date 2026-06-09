import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

export const cancelAppointment = async (req: Request, res: Response) => {
  try {
    const { customerId, appointmentId, cancellationReason } = req.body

    // 1. Validate
    if (!customerId || !appointmentId || !cancellationReason) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // 2. Get customer profile
    const customerProfile = await prisma.customerProfile.findUnique({
      where: { userId: customerId }
    })

    if (!customerProfile) {
      return res.status(404).json({ message: 'Customer profile not found' })
    }

    // 3. Find appointment and verify it belongs to this customer
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        customerId: customerProfile.id
      }
    })

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or unauthorized' })
    }

    // 4. Check if appointment can be cancelled
    const nonCancellableStatuses = ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'IN_PROGRESS']
    if (nonCancellableStatuses.includes(appointment.status)) {
      return res.status(400).json({
        message: `Cannot cancel appointment with status ${appointment.status}`
      })
    }

    // 5. Cancel appointment
    const cancelled = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'CANCELLED',
        cancellationReason,
        cancelledAt: new Date()
      },
      include: {
        service: { select: { name: true } },
        shop: { select: { shopName: true } }
      }
    })

    return res.status(200).json({
      message: 'Appointment cancelled successfully',
      appointment: cancelled
    })

  } catch (error) {
    console.error('cancelAppointment error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}