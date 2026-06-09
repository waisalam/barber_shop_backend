import { prisma } from "../../lib/prisma.js";
import { Request, Response } from "express";

export const createShop = async (req: Request, res: Response) => {
  try {
    const {
      id,
      shopName,
      description,
      address,
      pincode,
      city,
      state,
      locationLat,
      locationLng,
    } = await req.body;

    if(
      !id ||
      !shopName ||
      !description ||
      !address ||
      !pincode ||
      !city ||
      !state ||
      !locationLat ||
      !locationLng
    ){
      return res.status(400).json({ message: "All fields are required" });
    }

    const findUser = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!findUser) {
      return res.status(400).json({ message: "User not found" });
    }
    if(findUser.role !== "BARBER"){
      return res.status(400).json({ message: "You are not a barber" });
    }

    const existingShop = await prisma.barberShop.findFirst({
  where: { ownerId: id }
})

if (existingShop) {
  return res.status(409).json({ message: "You already have a shop" })
}

    const shop = await prisma.barberShop.create({
      data:{
        ownerId: findUser.id,
        shopName,
        description,
        address,
        pincode,
        city,
        state,
       locationLat: parseFloat(locationLat),
        locationLng: parseFloat(locationLng),
      }
    })

     await prisma.barberProfile.update({
      where: { userId: findUser.id},
      data: { shopId: shop.id }
    })

    return res.status(200).json({ message: "Shop created successfully", shop });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
