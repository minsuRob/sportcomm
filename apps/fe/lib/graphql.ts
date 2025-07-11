// sportcomm/apps/fe/lib/graphql.ts

/**
 * This file contains the GraphQL queries and mutations for interacting with the backend API.
 * Using a central file for these definitions helps maintain consistency.
 */

/**
 * Fetches a paginated list of posts for the main feed.
 * It retrieves all necessary fields to render a post card, along with pagination metadata.
 * The query now uses an 'input' object to pass arguments, matching the backend resolver.
 */
export const GET_POSTS = `
  query GetPosts($input: FindPostsInput) {
    posts(input: $input) {
      posts {
        id
        content
        createdAt
        type
        viewCount
        likeCount
        commentCount
        author {
          id
          nickname
          profileImageUrl
        }
        media {
          id
          url
          type
        }
        comments {
          id
        }
      }
      total
      page
      limit
      totalPages
      hasPrevious
      hasNext
    }
  }
`;

/**
 * Creates a new post.
 * The backend will use the authenticated user's ID for the author.
 * Returns the newly created post with the same fields as the feed query.
 */
export const CREATE_POST = `
  mutation CreatePost($createPostInput: CreatePostInput!) {
    createPost(createPostInput: $createPostInput) {
      id
      content
      createdAt
      type
      viewCount
      author {
        id
        nickname
        profileImageUrl
      }
      media {
        id
        url
        type
      }
      comments {
        id
      }
    }
  }
`;

/**
 * This is a placeholder for the like/unlike functionality.
 * The backend needs a 'toggleLike(postId: String!): Post' mutation to be implemented.
 * This mutation would ideally return the updated post or at least the new like count.
 */
export const TOGGLE_LIKE = `
  mutation ToggleLike($postId: String!) {
    # The backend resolver for this is not yet implemented.
    # When implemented, it should toggle the like status and ideally return the post.
    # For now, we assume it exists and might return a simple confirmation.
    toggleLike(postId: $postId) {
      id
      # likesCount # ideal return value
    }
  }
`;
