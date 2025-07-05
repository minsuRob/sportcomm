import React, { useState } from "react";
import {
  View,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { createPost } from "../api/post"; // Assuming API function exists

// Basic type for navigation prop for better type safety.
// For a real app, you would use more specific types from @react-navigation.
interface CreatePostScreenProps {
  navigation: {
    goBack: () => void;
  };
}

export default function CreatePostScreen({
  navigation,
}: CreatePostScreenProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert("Error", "Content cannot be empty.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createPost({ content });
      navigation.goBack();
    } catch (error) {
      console.error("Failed to create post:", error);
      Alert.alert("Error", "Failed to submit the post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <View style={styles.innerContainer}>
        <TextInput
          style={styles.input}
          placeholder="무엇을 생각하고 계신가요?"
          value={content}
          onChangeText={setContent}
          multiline
          placeholderTextColor="#999"
        />
        <Button
          title={isSubmitting ? "Submitting..." : "게시"}
          onPress={handleSubmit}
          disabled={isSubmitting}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  innerContainer: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
  },
  input: {
    flex: 1,
    fontSize: 16,
    textAlignVertical: "top", // For Android
    marginBottom: 16,
  },
});
