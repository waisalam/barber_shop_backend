
import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const { id, locationLat, locationLng } = req.body

    if (!id || !locationLat || !locationLng) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    await prisma.customerProfile.update({
      where: { userId: id },
      data: {
        locationLat: parseFloat(locationLat),
        locationLng: parseFloat(locationLng),
        locationUpdatedAt: new Date()
      }
    })

    return res.status(200).json({ message: 'Location updated successfully' })

  } catch (error) {
    console.error('updateLocation error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}