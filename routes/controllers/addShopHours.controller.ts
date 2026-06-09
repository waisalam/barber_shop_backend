import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

// hours array structure
interface ShopHourInput {
  dayOfWeek: number   // 0=Monday, 6=Sunday
  opensAt: string     // "09:00"
  closesAt: string    // "20:00"
  isClosed: boolean
}

export const addShopHours = async (req: Request, res: Response) => {
  try {
    const { shopId, ownerId, hours } = req.body

    // 1. Validate
    if (!shopId || !ownerId || !hours || !Array.isArray(hours)) {
      return res.status(400).json({ message: 'shopId, ownerId and hours array are required' })
    }

    if (hours.length === 0 || hours.length > 7) {
      return res.status(400).json({ message: 'Hours must have 1-7 days' })
    }

    // 2. Validate each hour entry
    for (const hour of hours) {
      if (hour.dayOfWeek < 0 || hour.dayOfWeek > 6) {
        return res.status(400).json({ message: `Invalid dayOfWeek: ${hour.dayOfWeek}. Must be 0-6` })
      }
      if (!hour.isClosed && (!hour.opensAt || !hour.closesAt)) {
        return res.status(400).json({ message: 'opensAt and closesAt are required when shop is open' })
      }
    }

    // 3. Check shop belongs to owner
    const shop = await prisma.barberShop.findFirst({
      where: { id: shopId, ownerId }
    })

    if (!shop) {
      return res.status(404).json({ message: 'Shop not found or unauthorized' })
    }

    // 4. Upsert hours — update if exists, create if not
    const upsertPromises = hours.map((hour: ShopHourInput) =>
      prisma.shopHour.upsert({
        where: {
          shopId_dayOfWeek: {
            shopId,
            dayOfWeek: hour.dayOfWeek
          }
        },
        update: {
          opensAt: hour.opensAt,
          closesAt: hour.closesAt,
          isClosed: hour.isClosed
        },
        create: {
          shopId,
          dayOfWeek: hour.dayOfWeek,
          opensAt: hour.opensAt,
          closesAt: hour.closesAt,
          isClosed: hour.isClosed
        }
      })
    )

    const shopHours = await Promise.all(upsertPromises)

    return res.status(200).json({
      message: 'Shop hours updated successfully',
      shopHours
    })

  } catch (error) {
    console.error('addShopHours error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}