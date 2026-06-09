import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const {
      userId,
      firstName,
      lastName,
      phoneNumber,
      gender,
      dateOfBirth,
      address,
      pincode,
      profilePictureUrl,
      // customer specific
      desiredDistanceKm,
      // barber specific
      bio,
      experienceYears
    } = req.body

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' })
    }

    // 1. Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // 2. Update user base fields — only update provided fields
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phoneNumber && { phoneNumber }),
        ...(gender && { gender }),
        ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
        ...(address && { address }),
        ...(pincode && { pincode }),
        ...(profilePictureUrl && { profilePictureUrl })
      },
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
        role: true
      }
    })

    // 3. Update customer profile if role is CUSTOMER
    if (user.role === 'CUSTOMER' && desiredDistanceKm) {
      await prisma.customerProfile.update({
        where: { userId },
        data: {
          desiredDistanceKm: parseFloat(desiredDistanceKm)
        }
      })
    }

    // 4. Update barber profile if role is BARBER
    if (user.role === 'BARBER') {
      await prisma.barberProfile.update({
        where: { userId },
        data: {
          ...(bio && { bio }),
          ...(experienceYears && { experienceYears: parseInt(experienceYears) })
        }
      })
    }

    // 5. Return updated full profile
    const fullProfile = await prisma.user.findUnique({
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
        customerProfile: user.role === 'CUSTOMER' ? {
          select: {
            desiredDistanceKm: true,
            locationLat: true,
            locationLng: true
          }
        } : false,
        barberProfile: user.role === 'BARBER' ? {
          select: {
            bio: true,
            experienceYears: true,
            avgRating: true,
            isAvailable: true
          }
        } : false
      }
    })

    return res.status(200).json({
      message: 'Profile updated successfully',
      user: fullProfile
    })

  } catch (error) {
    console.error('updateProfile error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}