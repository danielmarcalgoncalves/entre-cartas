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
    <Link href={href} className="folder-object" aria-label={`Abrir a pasta ${title}, ${count} cartas`}>
      <span className="folder-tab">{tag}</span>
      <span className="folder-label">{title}</span>
      <div className="folder-preview" aria-hidden="true">
        {(previews.length ? previews : ["um pedaço de memória", "para reler depois", "palavras guardadas"]).slice(0, 3).map((preview, index) => (
          <span key={`${preview}-${index}`} className="folder-paper-slip">{preview}</span>
        ))}
      </div>
      <span className="folder-bottom"><span>Arquivo pessoal</span><span className="folder-count">{String(count).padStart(2, "0")}</span></span>
    </Link>
  );
}
