import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { HappyPlace } from "./HappyPlace";

export const metadata = { title: "My Happy Place" };

export default async function HappyPlacePage() {
  const user = await requireUser();
  const [place, goals, future] = await Promise.all([
    db.happyPlace.upsert({ where: { userId: user.id }, create: { userId: user.id }, update: {} }),
    db.manualEntry.findMany({ where: { userId: user.id, category: { in: ["GOAL", "SUCCESS"] } }, orderBy: [{ category: "asc" }, { strength: "desc" }], take: 12 }),
    db.futureSelf.findUnique({ where: { userId: user.id } }),
  ]);
  return (
    <HappyPlace
      initial={{ name: place.name, scene: place.scene, palette: place.palette, weather: place.weather, sound: place.sound, music: place.music, pet: place.pet, decorations: place.decorations }}
      goals={goals.filter((g) => g.category === "GOAL").map((g) => g.content)}
      wins={goals.filter((g) => g.category === "SUCCESS").map((g) => g.content)}
      futureVision={future?.whoBecome || null}
    />
  );
}
