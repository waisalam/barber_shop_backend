import { prisma } from "../../lib/prisma.js";
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { transporter, getOTPEmailTemplate } from "../../lib/sendmail.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";


export const signup = async (req: Request, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNum,
      password,
      role,
      gender,
      dateOfBirth,
      address,
      pincode,
    } = await req.body;

    if (role == "ADMIN") {
      return res.status(400).json({ message: "Admin role is not allowed" });
    }
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneNum ||
      !password ||
      !role ||
      !gender ||
      !dateOfBirth ||
      !address ||
      !pincode
    ) {
      res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email,
        phoneNumber: phoneNum,
      },
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPassword = await bcrypt.hash(password, 10);

 const user = await prisma.$transaction(async(tx)=>{
       const newuser = await prisma.user.create({
      data: {
        firstName,
        lastName,
        email,
        phoneNumber: phoneNum,
        passwordHash: hashedPassword,
        otp: generatedOtp,
        role,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        address,
        pincode,
      },
       select: {
    id: true,
    firstName: true,   
    lastName: true,
    email: true,
    phoneNumber: true,
    role: true,
    gender: true,
    dateOfBirth: true,
    address: true,
    pincode: true,
    createdAt: true,
    updatedAt: true,
  }
    });

    if (role === 'CUSTOMER') {
    await tx.customerProfile.create({
      data: {
        userId: newuser.id
      }
    })
  } else if (role === 'BARBER') {
    await tx.barberProfile.create({
      data: {
        userId: newuser.id
      }
    })
  }

  return newuser
 })

    await transporter.sendMail({
      from: `"BarbersCloud" <${process.env.EMAIL}>`,
      to: user.email,
      subject: "Your BarbersCloud Verification Code",
      html: getOTPEmailTemplate(generatedOtp, user.firstName),
    });

    return res.status(201).json(user);
  } catch (error) {
   console.error('Signup error:', error)  // ← add this
  return res.status(500).json({ message: "Error while signing up user" })
  }
};

export const verify = async (req: Request, res: Response) => {
  try {
    const { id, otp } = await req.body;

    if (!id || !otp) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }
    if (!user.otp) {
      return res
        .status(404)
        .json({ message: "OTP not found, please signup again" });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        isEmailVerified: true,
      },
    });

    return res.status(200).json({ message: "Email verified successfully" });
  } catch (error) {
    return res.json({ message: "Error while verifying email" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = await req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }
    if (user.status === "BANNED" || user.status === "TERMINATED") {
      return res.status(403).json({ message: "Account suspended" });
    }
    if (user?.isEmailVerified === false) {
      return res.status(400).json({ message: "Please verify your email" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

// 6. Generate access token (short lived)
    const accessToken = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '15m' }
    )

    // 7. Generate refresh token (long lived)
    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_ACCESS_SECRET!,
      { expiresIn: '30d' }
    )

    // 8. Hash refresh token before storing in DB
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex')

    const sessionToken = crypto.randomUUID()

    // 9. Create session in DB
    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken,
        refreshTokenHash,
        deviceInfo: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
      }
    })

    // 10. Return BOTH tokens to mobile app
    return res.status(200).json({
      message: 'Login successful',
      accessToken,   // store in app memory
      refreshToken,  // store in SecureStore / AsyncStorage
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        profilePictureUrl: user.profilePictureUrl
      }
    })


  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ message: 'Error while logging in' })
  }
};
