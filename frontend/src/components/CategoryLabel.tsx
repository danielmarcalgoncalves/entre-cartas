import Link from "next/link";
import { getCategory } from "@/data/letters";

type CategoryLabelProps = {
  categoryId: string;
  small?: boolean;
  linked?: boolean;
  rotation?: number;
};

export default function CategoryLabel({ categoryId, small = false, linked = false, rotation = 0 }: CategoryLabelProps) {
  const category = getCategory(categoryId);
  if (!category) return null;
  const className = `category-label ${category.tone}${small ? " small" : ""}`;
  const style = { transform: `rotate(${rotation}deg)` };
  const content = <><span className="category-glyph" aria-hidden="true">{category.glyph}</span><span>{category.label}</span></>;
  return linked ? <Link className={className} style={style} href={`/discover?category=${category.id}`}>{content}</Link> : <span className={className} style={style}>{content}</span>;
}
