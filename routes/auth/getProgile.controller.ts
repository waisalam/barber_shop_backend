import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        pincode: true,
        profilePictureUrl: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
        customerProfile: {
          select: {
            id: true,
            desiredDistanceKm: true,
            locationLat: true,
            locationLng: true,
            locationUpdatedAt: true
          }
        },
        barberProfile: {
          select: {
            id: true,
            bio: true,
            avgRating: true,
            totalReviews: true,
            experienceYears: true,
            isAvailable: true,
            shopId: true,
            shop: {
              select: {
                id: true,
                shopName: true,
                address: true,
                city: true,
                avgRating: true,
                isOpen: true,
                status: true
              }
            }
          }
        },
        ownedShops: {
          select: {
            id: true,
            shopName: true,
            address: true,
            city: true,
            avgRating: true,
            totalReviews: true,
            isOpen: true,
            status: true,
            isVerified: true
          }
        }
      }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    return res.status(200).json({
      message: 'Profile fetched successfully',
      user
    })

  } catch (error) {
    console.error('getProfile error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}