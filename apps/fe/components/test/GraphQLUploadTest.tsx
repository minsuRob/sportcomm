import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useUploadFiles } from "@/lib/api/fileUpload";

/**
 * GraphQL 파일 업로드 테스트 컴포넌트
 */
export default function GraphQLUploadTest() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const { uploadFiles, loading, error } = useUploadFiles();

  const handleImagePicker = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("권한 필요", "갤러리 접근 권한이 필요합니다.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        selectionLimit: 4,
        quality: 1,
      });

      if (!result.canceled && result.assets) {
        const uris = result.assets.map((asset) => asset.uri);
        setSelectedImages(uris);
      }
    } catch (error) {
      console.error("이미지 선택 실패:", error);
      Alert.alert("오류", "이미지 선택 중 오류가 발생했습니다.");
    }
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0) {
      Alert.alert("알림", "업로드할 이미지를 선택해주세요.");
      return;
    }

    try {
      const result = await uploadFiles(selectedImages);
      console.log("업로드 성공:", result);
      Alert.alert("성공", `${result.length}개의 파일이 업로드되었습니다.`);
      setSelectedImages([]);
    } catch (error) {
      console.error("업로드 실패:", error);
      Alert.alert("실패", "파일 업로드에 실패했습니다.");
    }
  };

  return (
    <View style={{ padding: 20, backgroundColor: "white" }}>
      <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 20 }}>
        GraphQL 파일 업로드 테스트
      </Text>

      <TouchableOpacity
        style={{
          backgroundColor: "#007AFF",
          padding: 15,
          borderRadius: 8,
          marginBottom: 10,
        }}
        onPress={handleImagePicker}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          이미지 선택 ({selectedImages.length}/4)
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          backgroundColor: selectedImages.length > 0 ? "#34C759" : "#8E8E93",
          padding: 15,
          borderRadius: 8,
          marginBottom: 10,
        }}
        onPress={handleUpload}
        disabled={loading || selectedImages.length === 0}
      >
        <Text style={{ color: "white", textAlign: "center" }}>
          {loading ? "업로드 중..." : "업로드"}
        </Text>
      </TouchableOpacity>

      {error && (
        <Text style={{ color: "red", marginTop: 10 }}>
          에러: {error.message}
        </Text>
      )}

      {selectedImages.length > 0 && (
        <Text style={{ marginTop: 10 }}>
          선택된 이미지: {selectedImages.length}개
        </Text>
      )}
    </View>
  );
}
