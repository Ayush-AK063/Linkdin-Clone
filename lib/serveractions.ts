"use server";

import { Post } from "@/models/post.model";
import { IUser } from "@/models/user.model";
import { v2 as cloudinary } from "cloudinary";
import connectDB from "./db";
import { revalidatePath } from "next/cache";
import { Comment } from "@/models/comment.model";
import { ensureUserInDB } from "@/lib/ensureUserInDB"; // ✅ new helper

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

// ✅ Create Post using server actions
export const createPostAction = async (inputText: string, selectedFile: string) => {
  await connectDB();
  const mongoUser = await ensureUserInDB(); // ✅ ensures MongoDB user
  if (!mongoUser) throw new Error("User not authenticated");
  if (!inputText) throw new Error("Input field is required");

  const image = selectedFile;

  const userDatabase: IUser = {
    firstName: mongoUser.firstName,
    lastName: mongoUser.lastName,
    userId: mongoUser.userId,
    profilePhoto: mongoUser.profilePhoto
  };

  let uploadResponse;
  try {
    if (image) {
      // 1. Create post with image
      uploadResponse = await cloudinary.uploader.upload(image);
      await Post.create({
        description: inputText,
        user: userDatabase,
        imageUrl: uploadResponse?.secure_url
      });
    } else {
      // 2. Create post with text only
      await Post.create({
        description: inputText,
        user: userDatabase
      });
    }
    revalidatePath("/");
  } catch (error: any) {
    throw new Error(error);
  }
};

// ✅ Get all posts
export const getAllPosts = async () => {
  try {
    await connectDB();
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate({ path: "comments", options: { sort: { createdAt: -1 } } });
    if (!posts) return [];
    return JSON.parse(JSON.stringify(posts));
  } catch (error) {
    console.log(error);
  }
};

// ✅ Delete post by ID
export const deletePostAction = async (postId: string) => {
  await connectDB();
  const mongoUser = await ensureUserInDB();
  if (!mongoUser) throw new Error("User not authenticated");

  const post = await Post.findById(postId);
  if (!post) throw new Error("Post not found.");

  // Can only delete own post
  if (post.user.userId !== mongoUser.userId) {
    throw new Error("You are not the owner of this Post.");
  }
  try {
    await Post.deleteOne({ _id: postId });
    revalidatePath("/");
  } catch (error: any) {
    throw new Error("An error occurred", error);
  }
};

// ✅ Create comment
export const createCommentAction = async (postId: string, formData: FormData) => {
  try {
    const mongoUser = await ensureUserInDB();
    if (!mongoUser) throw new Error("User not authenticated");

    const inputText = formData.get("inputText") as string;
    if (!inputText) throw new Error("Field is required");
    if (!postId) throw new Error("Post id required");

    const userDatabase: IUser = {
      firstName: mongoUser.firstName,
      lastName: mongoUser.lastName,
      userId: mongoUser.userId,
      profilePhoto: mongoUser.profilePhoto
    };

    const post = await Post.findById({ _id: postId });
    if (!post) throw new Error("Post not found");

    const comment = await Comment.create({
      textMessage: inputText,
      user: userDatabase
    });

    post.comments?.push(comment._id);
    await post.save();

    revalidatePath("/");
  } catch (error) {
    throw new Error("An error occurred");
  }
};
