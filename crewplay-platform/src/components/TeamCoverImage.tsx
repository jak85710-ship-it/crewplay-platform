"use client";

import Image from "next/image";
import { useState } from "react";

import { BRAND_LOGO_PATH, getTeamPhotoUrl, isUploadedTeamPhoto } from "@/lib/utils";

type Props = {
  team: { photo: string; sheet_row: number; arena_name: string };
  priority?: boolean;
  sizes?: string;
  coverClassName?: string;
  logoClassName?: string;
};

export function TeamCoverImage({
  team,
  priority,
  sizes = "(max-width:768px) 100vw, 33vw",
  coverClassName = "object-cover transition group-hover:scale-[1.02]",
  logoClassName = "object-contain p-8 sm:p-12",
}: Props) {
  const initial = getTeamPhotoUrl(team);
  const [src, setSrc] = useState(initial);
  const showLogo = !isUploadedTeamPhoto(team) || src === BRAND_LOGO_PATH;

  return (
    <Image
      src={src}
      alt={team.arena_name}
      fill
      className={showLogo ? logoClassName : coverClassName}
      sizes={sizes}
      unoptimized
      priority={priority}
      onError={() => setSrc(BRAND_LOGO_PATH)}
    />
  );
}
