import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

export const createReview = async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      appointmentId,
      shopRating,
      barberRating,
      comment
    } = req.body

    // 1. Validate
    if (!customerId || !appointmentId || !shopRating || !barberRating) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // 2. Validate ratings are 1-5
    if (shopRating < 1 || shopRating > 5 || barberRating < 1 || barberRating > 5) {
      return res.status(400).json({ message: 'Ratings must be between 1 and 5' })
    }

    // 3. Get customer profile
    const customerProfile = await prisma.customerProfile.findUnique({
      where: { userId: customerId }
    })

    if (!customerProfile) {
      return res.status(404).json({ message: 'Customer profile not found' })
    }

    // 4. Find appointment — must belong to customer and be completed
    const appointment = await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        customerId: customerProfile.id,
        status: 'COMPLETED'  // only completed appointments can be reviewed
      }
    })

    if (!appointment) {
      return res.status(404).json({
        message: 'Appointment not found, unauthorized, or not completed yet'
      })
    }

    // 5. Check review doesn't already exist
    const existingReview = await prisma.review.findUnique({
      where: { appointmentId }
    })

    if (existingReview) {
      return res.status(409).json({ message: 'Review already submitted for this appointment' })
    }

    // 6. Create review + update ratings in one transaction
    const review = await prisma.$transaction(async (tx) => {

      // create review
      const newReview = await tx.review.create({
        data: {
          appointmentId,
          customerId: customerProfile.id,
          shopId: appointment.shopId,
          barberId: appointment.barberId,
          shopRating: parseInt(shopRating),
          barberRating: parseInt(barberRating),
          comment
        }
      })

      // get all shop reviews to recalculate avg
      const shopReviews = await tx.review.findMany({
        where: { shopId: appointment.shopId },
        select: { shopRating: true }
      })

      const newShopAvg = shopReviews.reduce((sum, r) => sum + r.shopRating, 0) / shopReviews.length

      // update shop avgRating and totalReviews
      await tx.barberShop.update({
        where: { id: appointment.shopId },
        data: {
          avgRating: parseFloat(newShopAvg.toFixed(2)),
          totalReviews: shopReviews.length
        }
      })

      // get all barber reviews to recalculate avg
      const barberReviews = await tx.review.findMany({
        where: { barberId: appointment.barberId },
        select: { barberRating: true }
      })

      const newBarberAvg = barberReviews.reduce((sum, r) => sum + r.barberRating, 0) / barberReviews.length

      // update barber avgRating and totalReviews
      await tx.barberProfile.update({
        where: { id: appointment.barberId },
        data: {
          avgRating: parseFloat(newBarberAvg.toFixed(2)),
          totalReviews: barberReviews.length
        }
      })

      return newReview
    })

    return res.status(201).json({
      message: 'Review submitted successfully',
      review
    })

  } catch (error) {
    console.error('createReview error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}