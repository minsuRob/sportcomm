import { Drawer } from "expo-router/drawer";

export default function DrawerLayout() {
  return (
    <Drawer>
      <Drawer.Screen
        name="feed"
        options={{
          drawerLabel: "Feed",
          title: "Feed",
        }}
      />
      <Drawer.Screen
        name="search"
        options={{
          drawerLabel: "Search",
          title: "Search",
        }}
      />
      <Drawer.Screen
        name="profile"
        options={{
          drawerLabel: "Profile",
          title: "Profile",
        }}
      />
    </Drawer>
  );
}
