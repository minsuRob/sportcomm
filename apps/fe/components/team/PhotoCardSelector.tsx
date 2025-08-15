import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  Dimensions,
  ViewStyle,
  TextStyle,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Portal } from "@rn-primitives/portal";
import { useAppTheme } from "@/lib/theme/context";
import type { ThemedStyle } from "@/lib/theme/types";

// Mock Data for Photo Cards
const photoCards = [
  {
    id: "1",
    name: "JUNG SOO BIN",
    position: "OUTFIELDER",
    image:
      "https://via.placeholder.com/300x450.png/000000/FFFFFF?text=JUNG+SOO+BIN",
    tier: "LEGENDARY",
    cardStyle: "gold",
  },
  {
    id: "2",
    name: "YANG SUK HWAN",
    position: "INFIELDER",
    image:
      "https://via.placeholder.com/300x450.png/000000/FFFFFF?text=YANG+SUK+HWAN",
    tier: "LEGENDARY",
    cardStyle: "gold",
  },
  {
    id: "3",
    name: "GWAK BEEN",
    position: "PITCHER",
    image:
      "https://via.placeholder.com/300x450.png/FF4500/FFFFFF?text=GWAK+BEEN",
    tier: "RARE",
    cardStyle: "abstract",
  },
  {
    id: "4",
    name: "OH MYEONG JIN",
    position: "INFIELDER",
    image:
      "https://via.placeholder.com/300x450.png/1E90FF/FFFFFF?text=OH+MYEONG+JIN",
    tier: "RARE",
    cardStyle: "abstract",
  },
  {
    id: "5",
    name: "KIM HO JUN",
    position: "CATCHER",
    image:
      "https://via.placeholder.com/300x450.png/32CD32/FFFFFF?text=KIM+HO+JUN",
    tier: "COMMON",
    cardStyle: "simple",
  },
  {
    id: "6",
    name: "CHOI JAE HYUN",
    position: "OUTFIELDER",
    image:
      "https://via.placeholder.com/300x450.png/FF69B4/FFFFFF?text=CHOI+JAE+HYUN",
    tier: "COMMON",
    cardStyle: "cute",
  },
];

export interface PhotoCardSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectCard: (cardId: string) => void;
}

interface CustomizationOptions {
  backgroundColor: string;
  textColor: string;
  fontStyle: "normal" | "italic";
}

const { width } = Dimensions.get("window");
const CARD_MARGIN = 16;
const CARD_WIDTH = (width - CARD_MARGIN * 3) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

export default function PhotoCardSelector({
  visible,
  onClose,
  onSelectCard,
}: PhotoCardSelectorProps) {
  const { themed, theme } = useAppTheme();
  const [isModalVisible, setModalVisible] = useState(false);
  const [selectedCard, setSelectedCard] = useState<
    (typeof photoCards)[0] | null
  >(null);
  const [customizations, setCustomizations] = useState<
    Record<string, CustomizationOptions>
  >({});

  const openCustomizer = (card: (typeof photoCards)[0]) => {
    setSelectedCard(card);
    setModalVisible(true);
  };

  const applyCustomization = (options: CustomizationOptions) => {
    if (selectedCard) {
      setCustomizations((prev) => ({ ...prev, [selectedCard.id]: options }));
    }
    setModalVisible(false);
  };

  if (!visible) return null;

  const renderCard = (card: (typeof photoCards)[0]) => {
    const cardCustomization = customizations[card.id];
    const cardStyles: any[] = [
      styles.card,
      { width: CARD_WIDTH, height: CARD_HEIGHT },
      cardCustomization && {
        backgroundColor: cardCustomization.backgroundColor,
      },
    ];
    // Add custom styles based on card.cardStyle
    switch (card.cardStyle) {
      case "gold":
        cardStyles.push(styles.goldCard);
        break;
      case "abstract":
        cardStyles.push(styles.abstractCard);
        break;
      case "cute":
        cardStyles.push(styles.cuteCard);
        break;
      default:
        cardStyles.push(styles.simpleCard);
    }

    return (
      <View key={card.id} style={{ marginBottom: CARD_MARGIN }}>
        <TouchableOpacity
          style={cardStyles}
          onPress={() => onSelectCard(card.id)}
          activeOpacity={0.8}
        >
          <Image source={{ uri: card.image }} style={styles.cardImage} />
          <View style={styles.cardOverlay}>
            <Text
              style={[
                styles.cardName,
                cardCustomization && {
                  color: cardCustomization.textColor,
                  fontStyle: cardCustomization.fontStyle,
                },
              ]}
            >
              {card.name}
            </Text>
            <Text style={styles.cardPosition}>{card.position}</Text>
            {card.tier && <Text style={styles.cardTier}>{card.tier}</Text>}
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.customizeButton}
          onPress={() => openCustomizer(card)}
        >
          <Text style={styles.customizeButtonText}>꾸미기</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Portal name="photocard-selector">
      <View style={themed($container)}>
        <View style={themed($header)}>
          <Text style={themed($title)}>포토카드 선택</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.grid}>
          {photoCards.map(renderCard)}
        </ScrollView>
        <CustomizationModal
          visible={isModalVisible}
          onClose={() => setModalVisible(false)}
          onApply={applyCustomization}
          card={selectedCard}
        />
      </View>
    </Portal>
  );
}

function CustomizationModal({ visible, onClose, onApply, card }) {
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF");
  const [textColor, setTextColor] = useState("#000000");
  const [fontStyle, setFontStyle] = useState<"normal" | "italic">("normal");

  useEffect(() => {
    if (card) {
      // Reset to default or load existing customization
      setBackgroundColor("#FFFFFF");
      setTextColor("#000000");
      setFontStyle("normal");
    }
  }, [card]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{card?.name} 카드 꾸미기</Text>
          {/* Add color pickers and font style selectors here */}
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => onApply({ backgroundColor, textColor, fontStyle })}
          >
            <Text>적용</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text>닫기</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: CARD_MARGIN,
  },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  cardOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  cardName: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textShadowColor: "rgba(0, 0, 0, 0.75)",
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  cardPosition: {
    color: "white",
    fontSize: 12,
  },
  cardTier: {
    position: "absolute",
    bottom: 12,
    left: 12,
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Custom Card Styles
  goldCard: {
    borderColor: "#FFD700",
    borderWidth: 2,
  },
  abstractCard: {
    borderColor: "#4A90E2",
    borderWidth: 2,
  },
  cuteCard: {
    borderColor: "#FF69B4",
    borderWidth: 2,
  },
  simpleCard: {
    borderColor: "#E0E0E0",
    borderWidth: 1,
  },
  customizeButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
  },
  customizeButtonText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  applyButton: {
    marginTop: 20,
    padding: 10,
    backgroundColor: "#4A90E2",
    alignItems: "center",
    borderRadius: 5,
  },
  closeButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#E0E0E0",
    alignItems: "center",
    borderRadius: 5,
  },
});

const $container: ThemedStyle<ViewStyle> = ({ colors }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: colors.background,
  zIndex: 2000,
});

const $header: ThemedStyle<ViewStyle> = ({ colors, spacing }) => ({
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  padding: spacing.md,
  borderBottomWidth: 1,
  borderBottomColor: colors.border,
});

const $title: ThemedStyle<TextStyle> = ({ colors }) => ({
  fontSize: 20,
  fontWeight: "bold",
  color: colors.text,
});
