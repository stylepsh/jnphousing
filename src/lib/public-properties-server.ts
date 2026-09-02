import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import {
  findPublicPropertyGroup,
  groupPublicProperties,
  type PublicPropertyGroup,
  type PublicPropertySource,
} from "@/lib/public-properties";
import { PUBLIC_SHOWCASE_PROPERTIES } from "@/lib/data/public-showcase";

export const fetchPublicPropertyRows = cache(async (): Promise<PublicPropertySource[]> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("properties")
      .select("id,name,address,type,total_units,is_published,display_order,created_at,updated_at,unit_type,parent_building_id,unit_no,ho,short_alias,household_count")
      .eq("is_published", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) return [];
    return (data ?? []) as PublicPropertySource[];
  } catch {
    return [];
  }
});

export const fetchPublicPropertyGroups = cache(async (): Promise<PublicPropertyGroup[]> => {
  return PUBLIC_SHOWCASE_PROPERTIES;
});

export const fetchPublicPropertyGroup = cache(async (sourceId: string): Promise<PublicPropertyGroup | null> => {
  const showcase = PUBLIC_SHOWCASE_PROPERTIES.find((property) => property.id === sourceId);
  if (showcase) return showcase;

  // 이전에 공유된 UUID 상세주소도 끊기지 않도록 공개용 예시 현장으로 연결한다.
  const rows = await fetchPublicPropertyRows();
  const legacyGroup = findPublicPropertyGroup(rows, sourceId);
  if (!legacyGroup) return null;
  const legacyGroups = groupPublicProperties(rows);
  const index = legacyGroups.findIndex((group) => group.id === legacyGroup.id);
  return PUBLIC_SHOWCASE_PROPERTIES[Math.max(index, 0) % PUBLIC_SHOWCASE_PROPERTIES.length];
});

export async function fetchPublicVacancyCount(sourceIds: string[]): Promise<number> {
  if (sourceIds.length === 0) return 0;

  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("vacancies")
      .select("*", { count: "exact", head: true })
      .in("property_id", sourceIds)
      .eq("is_published", true)
      .eq("status", "available");
    return count ?? 0;
  } catch {
    return 0;
  }
}
