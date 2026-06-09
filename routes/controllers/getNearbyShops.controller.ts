// controllers/shop/getNearbyShops.controller.ts
import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'

// Haversine formula - calculates distance between two coordinates in km
function getDistanceKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371 // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLng = (lng2 - lng1) * (Math.PI / 180)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export const getNearbyShops = async (req: Request, res: Response) => {
  try {
    const { lat, lng, radiusKm } = req.query

    // 1. Validate
    if (!lat || !lng) {
      return res.status(400).json({ message: 'lat and lng are required' })
    }

    const customerLat = parseFloat(lat as string)
    const customerLng = parseFloat(lng as string)
    const radius = radiusKm ? parseFloat(radiusKm as string) : 2 // default 2km

    if (isNaN(customerLat) || isNaN(customerLng)) {
      return res.status(400).json({ message: 'Invalid lat or lng' })
    }

    // 2. Get all active + verified shops only
    const allShops = await prisma.barberShop.findMany({
      where: {
        status: 'ACTIVE',
        isVerified: true,   // only registered/verified shops
        isOpen: true        // only currently open shops
      },
      select: {
        id: true,
        shopName: true,
        address: true,
        city: true,
        state: true,
        locationLat: true,
        locationLng: true,
        avgRating: true,
        totalReviews: true,
        isOpen: true,
        shopHours: {
          select: {
            dayOfWeek: true,
            opensAt: true,
            closesAt: true,
            isClosed: true
          }
        },
        services: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            price: true,
            durationMinutes: true
          }
        },
        barbers: {
          where: { isAvailable: true },
          select: {
            id: true,
            bio: true,
            avgRating: true,
            experienceYears: true,
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
    })

    // 3. Filter by distance
    const nearbyShops = allShops
      .map(shop => ({
        ...shop,
        distanceKm: parseFloat(
          getDistanceKm(customerLat, customerLng, shop.locationLat, shop.locationLng).toFixed(2)
        )
      }))
      .filter(shop => shop.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm) // nearest first

    if (nearbyShops.length === 0) {
      return res.status(200).json({
        message: 'No shops found nearby',
        shops: []
      })
    }

    return res.status(200).json({
      message: 'Nearby shops fetched successfully',
      total: nearbyShops.length,
      shops: nearbyShops
    })

  } catch (error) {
    console.error('getNearbyShops error:', error)
    return res.status(500).json({ message: 'Error fetching nearby shops' })
  }
}