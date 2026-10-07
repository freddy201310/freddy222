"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { DECORATIONS, MUSIC, PALETTES, PETS, SCENES, SOUNDS, WEATHERS } from "@/lib/options";

const ids = <T extends readonly { id: string }[]>(list: T) => list.map((x) => x.id) as [string, ...string[]];

const Schema = z.object({
  name: z.string().trim().min(1).max(60),
  scene: z.enum(ids(SCENES)),
  palette: z.enum(ids(PALETTES)),
  weather: z.enum(ids(WEATHERS)),
  sound: z.enum(ids(SOUNDS)),
  music: z.enum(ids(MUSIC)),
  pet: z.enum(ids(PETS)),
  decorations: z.array(z.enum(ids(DECORATIONS))).max(6),
});

export type HappyPlaceInput = z.infer<typeof Schema>;

export async function saveHappyPlace(input: HappyPlaceInput) {
  const user = await requireUser();
  const data = Schema.parse(input);
  await db.happyPlace.upsert({ where: { userId: user.id }, create: { userId: user.id, ...data }, update: data });
  revalidatePath("/happy-place");
}
