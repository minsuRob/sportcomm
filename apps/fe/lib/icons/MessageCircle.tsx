import { Ionicons } from "@expo/vector-icons";
import { iconWithClassName } from "./iconWithClassName";

iconWithClassName(Ionicons);
export const MessageCircle = (props: any) => (
  <Ionicons name="chatbubble" {...props} />
);
