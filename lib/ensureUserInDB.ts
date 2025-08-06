import { User } from "@/models/user.model";
import { currentUser } from "@clerk/nextjs/server";
import connectDB from "@/lib/db";

export const ensureUserInDB = async () => {
  await connectDB();
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  let mongoUser = await User.findOne({ userId: clerkUser.id });
  if (!mongoUser) {
    mongoUser = await User.create({
      userId: clerkUser.id,
      firstName: clerkUser.firstName || "Guest",
      lastName: clerkUser.lastName || "User",
      profilePhoto: clerkUser.imageUrl
    });
  }
  return mongoUser;
};
