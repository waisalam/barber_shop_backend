import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

export const getShopReviews = async (req: Request, res: Response) => {
  try {
    const { shopId } = req.body

    if (!shopId) {
      return res.status(400).json({ message: 'shopId is required' })
    }

    const shop = await prisma.barberShop.findUnique({
      where: { id: shopId },
      select: { shopName: true, avgRating: true, totalReviews: true }
    })

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found' })
    }

    const reviews = await prisma.review.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' },
      include: {
        appointment: {
          select: {
            customer: {
              select: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    profilePictureUrl: true
                  }
                }
              }
            }
          }
        }
      }
    })

    return res.status(200).json({
      message: 'Reviews fetched successfully',
      shop,
      totalReviews: reviews.length,
      reviews
    })

  } catch (error) {
    console.error('getShopReviews error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}