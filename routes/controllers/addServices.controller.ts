import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

export const addService = async (req: Request, res: Response) => {
  try {
    const {
      shopId,
      ownerId,
      name,
      description,
      price,
      durationMinutes
    } = req.body

    // 1. Validate
    if (!shopId || !ownerId || !name || !price || !durationMinutes) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    // 2. Check shop belongs to owner
    const shop = await prisma.barberShop.findFirst({
      where: { id: shopId, ownerId }
    })

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found or unauthorized' })
    }

    // 3. Create service
    const service = await prisma.service.create({
      data: {
        shopId,
        name,
        description,
        price: parseFloat(price),
        durationMinutes: parseInt(durationMinutes)
      }
    })

    return res.status(201).json({
      message: 'Service added successfully',
      service
    })

  } catch (error) {
    console.error('addService error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}