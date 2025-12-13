export function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    // normalize accented characters (é → e, ö → o)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // replace spaces & underscores with hyphen
    .replace(/[\s_]+/g, '-')
    // remove all non-alphanumeric & hyphen
    .replace(/[^a-z0-9-]/g, '')
    // remove multiple hyphens
    .replace(/-+/g, '-')
    // trim hyphens from start & end
    .replace(/^-+|-+$/g, '');
}
