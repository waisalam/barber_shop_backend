import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

// valid status transitions
const validTransitions: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['IN_PROGRESS', 'CANCELLED', 'NO_SHOW'],
  IN_PROGRESS: ['COMPLETED'],
  COMPLETED: [],   // final state
  CANCELLED: [],   // final state
  NO_SHOW: []      // final state
}

export const updateAppointmentStatus = async (req: Request, res: Response) => {
  try {
    const {
      appointmentId,
      barberId,       // barber profile id for verification
      status,
      cancellationReason
    } = req.body

    // 1. Validate
    if (!appointmentId || !barberId || !status) {
      return res.status(400).json({ message: 'appointmentId, barberId and status are required' })
    }

    // 2. Check valid status value
    const validStatuses = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` })
    }

    // 3. Find appointment
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        barberId  // makes sure barber owns this appointment
      }
    })

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found or unauthorized' })
    }

    // 4. Check valid transition
    const allowedNextStatuses = validTransitions[appointment.status]
    if (!allowedNextStatuses.includes(status)) {
      return res.status(400).json({
        message: `Cannot change status from ${appointment.status} to ${status}`
      })
    }

    // 5. Cancellation reason required when cancelling
    if (status === 'CANCELLED' && !cancellationReason) {
      return res.status(400).json({ message: 'Cancellation reason is required' })
    }

    // 6. Update appointment
    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status,
        ...(status === 'CANCELLED' && {
          cancellationReason,
          cancelledAt: new Date()
        })
      },
      include: {
        service: {
          select: { name: true }
        },
        shop: {
          select: { shopName: true }
        }
      }
    })

    return res.status(200).json({
      message: `Appointment ${status.toLowerCase()} successfully`,
      appointment: updated
    })

  } catch (error) {
    console.error('updateAppointmentStatus error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}