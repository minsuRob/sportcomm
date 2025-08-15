import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useFileUpload } from "@/lib/api/fileUpload";
import AppDialog from "@/components/ui/AppDialog";

/**
 * GraphQL 파일 업로드 테스트 컴포넌트
 */
export default function GraphQLUploadTest() {
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const { uploadFiles } = useFileUpload();
  const loading = false;
  const error = null;
  const [dialog, setDialog] = useState<{
    visible: boolean;
    title: string;
    description: string;
  }>({ visible: false, title: "", description: "" });

  const handleImagePicker = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        setDialog({
          visible: true,
          title: "권한 필요",
          description: "갤러리 접근 권한이 필요합니다.",
        });
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
      setDialog({
        visible: true,
        title: "오류",
        description: "이미지 선택 중 오류가 발생했습니다.",
      });
    }
  };

  const handleUpload = async () => {
    if (selectedImages.length === 0) {
      setDialog({
        visible: true,
        title: "알림",
        description: "업로드할 이미지를 선택해주세요.",
      });
      return;
    }

    try {
      const result = await uploadFiles(selectedImages);
      console.log("업로드 성공:", result);
      setDialog({
        visible: true,
        title: "성공",
        description: `${result.length}개의 파일이 업로드되었습니다.`,
      });
      setSelectedImages([]);
    } catch (error) {
      console.error("업로드 실패:", error);
      setDialog({
        visible: true,
        title: "실패",
        description: "파일 업로드에 실패했습니다.",
      });
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
      <AppDialog
        visible={dialog.visible}
        onClose={() => setDialog({ ...dialog, visible: false })}
        title={dialog.title}
        description={dialog.description}
        confirmText="확인"
        onConfirm={() => setDialog({ ...dialog, visible: false })}
      />
    </View>
  );
}
