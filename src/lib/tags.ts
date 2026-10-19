/** The URL part of a tag: lowercase ASCII, "allmän pension" -> "allman-pension". */
export function tagSlug(tag: string): string {
  return tag
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/ö/g, "o")
    .replace(/é/g, "e")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** How a tag is shown: as a hashtag without spaces, "allmän pension" -> "#allmänpension". */
export function hashtag(tag: string): string {
  return `#${tag.replace(/\s+/g, "")}`;
}

export function tagHref(tag: string): string {
  return `/nyheter/tagg/${tagSlug(tag)}`;
}
