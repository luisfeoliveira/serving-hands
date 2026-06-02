import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { roleToPath } from "@/lib/roles";
import { listUsers } from "./actions";
import { UsersClient } from "./users-client";

export default async function UsuariosPage() {
  const [profile, users] = await Promise.all([requireProfile(), listUsers()]);
  if (profile.role !== "admin") {
    redirect(roleToPath(profile.role));
  }

  return <UsersClient initialUsers={users} />;
}
