import { prisma } from '../../lib/prisma.js'
import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'

export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required' })
    }

    // 1. Verify refresh token signature
    let decoded: { userId: string }
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!) as { userId: string }
    } catch (error) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' })
    }

    // 2. Hash incoming refresh token to compare with DB
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex')

    // 3. Find session in DB
    const session = await prisma.session.findFirst({
      where: {
        refreshTokenHash,
        userId: decoded.userId,
        isRevoked: false,
        expiresAt: { gt: new Date() }  // not expired
      }
    })

    if (!session) {
      return res.status(401).json({ message: 'Session not found or expired, please login again' })
    }

    // 4. Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (user.status === 'BANNED' || user.status === 'TERMINATED') {
      return res.status(403).json({ message: 'Account suspended' })
    }

    // 5. Generate new access token
    const newAccessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' }
    )

    // 6. Generate new refresh token
    const newRefreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: '30d' }
    )

    const newRefreshTokenHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex')

    // 7. Update session with new refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        lastUsedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      }
    })

    return res.status(200).json({
      message: 'Token refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    })

  } catch (error) {
    console.error('refresh error:', error)
    return res.status(500).json({ message: 'Internal server error' })
  }
}