import api from "./api";
import { AxiosError } from "axios";

// Define a basic Post type. This should be consistent across the app.
interface Post {
  id: number | string;
  content: string;
  images?: string[];
  // Add other post properties like user, likes, etc., as needed
}

// Define the shape of the data needed to create a post.
interface CreatePostData {
  content: string;
  images?: string[];
}

/**
 * Fetches the main feed posts.
 * @returns A promise that resolves to an array of posts.
 * @throws Throws a formatted error if the request fails.
 */
export async function getFeedPosts(): Promise<Post[]> {
  try {
    const res = await api.get<Post[]>("/feed");
    return res.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error("Get Feed API error:", error.response?.data);
      throw new Error(error.response?.data?.message || "Failed to fetch feed");
    }
    console.error("An unexpected error occurred while fetching feed:", error);
    throw new Error("An unexpected error occurred. Please try again.");
  }
}

/**
 * Creates a new post.
 * @param data - The data for the new post (content, images).
 * @returns A promise that resolves to the newly created post.
 * @throws Throws a formatted error if the request fails.
 */
export async function createPost(data: CreatePostData): Promise<Post> {
  try {
    const res = await api.post<Post>("/posts", data);
    return res.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      console.error("Create Post API error:", error.response?.data);
      throw new Error(error.response?.data?.message || "Failed to create post");
    }
    console.error("An unexpected error occurred while creating a post:", error);
    throw new Error("An unexpected error occurred. Please try again.");
  }
}
