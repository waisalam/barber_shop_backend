import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

export const updateShop = async (req: Request, res: Response) => {
  try {
    const {
      id,          // shop id
      ownerId,     // user id for verification
      shopName,
      description,
      address,
      pincode,
      city,
      state,
      locationLat,
      locationLng,
      isOpen
    } = req.body

    if (!id || !ownerId) {
      return res.status(400).json({ message: 'Shop id and ownerId are required' })
    }

    // 1. Check shop exists and belongs to this user
    const shop = await prisma.barberShop.findFirst({
      where: {
        id,
        ownerId
      }
    })

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found or unauthorized' })
    }

    // 2. Update only fields that are provided
    const updatedShop = await prisma.barberShop.update({
      where: { id },
      data: {
        ...(shopName && { shopName }),
        ...(description && { description }),
        ...(address && { address }),
        ...(pincode && { pincode }),
        ...(city && { city }),
        ...(state && { state }),
        ...(locationLat && { locationLat: parseFloat(locationLat) }),
        ...(locationLng && { locationLng: parseFloat(locationLng) }),
        ...(isOpen !== undefined && { isOpen })
      }
    })

    return res.status(200).json({
      message: 'Shop updated successfully',
      shop: updatedShop
    })

  } catch (error) {
    console.error('updateShop error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}