import { auth } from "@/auth";
import NavbarContent from "./NavbarContent";

export default async function Navbar() {
  const session = await auth();

  console.log("NAVBAR SESSION:", session);

  if (!session?.user?.id) {
    console.log("NAVBAR: NO USER ID");
    return null;
  }

  console.log("NAVBAR: USER FOUND", session.user.id);

  return <NavbarContent />;
}