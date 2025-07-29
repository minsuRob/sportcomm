import { Ionicons } from "@expo/vector-icons";
import { iconWithClassName } from "./iconWithClassName";

iconWithClassName(Ionicons);
export const Info = (props: any) => (
  <Ionicons name="information-circle" {...props} />
);
