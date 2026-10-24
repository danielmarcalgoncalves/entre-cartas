import Link from "next/link";

type FolderProps = {
  title: string;
  count: number;
  href: string;
  tag: string;
  previews?: string[];
};

export default function Folder({ title, count, href, tag, previews = [] }: FolderProps) {
  return (
    <Link href={href} className="folder-object" aria-label={`Open folder ${title}, ${count} letters`}>
      <span className="folder-tab">{tag}</span>
      <span className="folder-label">{title}</span>
      <div className="folder-preview" aria-hidden="true">
        {(previews.length ? previews : ["a piece of memory", "to reread later", "treasured words"]).slice(0, 3).map((preview, index) => (
          <span key={`${preview}-${index}`} className="folder-paper-slip">{preview}</span>
        ))}
      </div>
      <span className="folder-bottom"><span>Personal archive</span><span className="folder-count">{String(count).padStart(2, "0")}</span></span>
    </Link>
  );
}
