"use client";

import Link from "next/link";
import Folder from "@/components/Folder";
import LetterCard from "@/components/LetterCard";
import { useArchive } from "@/hooks/useArchive";
import { letters } from "@/data/letters";

const folderDefinitions = [
  { id: "amor", title: "Love notes", tag: "drawer 01", category: "amor", preview: ["a name written slowly", "the summer of us", "with love, always"] },
  { id: "saudade", title: "Longings with an address", tag: "drawer 02", category: "saudade", preview: ["our old street", "a keepsake portrait", "when it rains"] },
  { id: "nunca-enviadas", title: "What remained unsaid", tag: "drawer 03", category: "nunca-enviadas", preview: ["for you, perhaps", "folded in four", "stay here, then"] },
  { id: "outras", title: "Other kept papers", tag: "open archive", category: "other", preview: ["little findings", "to reread later", "words of home"] },
];

export default function CollectionsPage() {
  const { ids } = useArchive("saved");
  const saved = letters.filter((letter) => ids.includes(letter.id));
  const groups = folderDefinitions.map((folder) => ({
    ...folder,
    items: folder.category === "other" ? saved.filter((letter) => !["amor", "saudade", "nunca-enviadas"].includes(letter.category)) : saved.filter((letter) => letter.category === folder.category),
  }));
  return (
    <div className="page-shell">
      <header className="page-heading">
        <span className="eyebrow">Archive folders · memories in their own order</span>
        <h1 className="display-title">Kept Collections</h1>
        <p className="page-intro">A quiet chest for letters you never want to lose. When you file correspondence, it finds a home in one of these paper folders.</p>
      </header>
      <div className="folder-shelf">
        <Folder title="All I've Kept" count={saved.length} href="#arquivo-completo" tag="main folder" previews={saved.slice(0, 3).map((letter) => letter.title)} />
        {groups.map((folder) => <Folder key={folder.id} title={folder.title} count={folder.items.length} href={`#folder-${folder.id}`} tag={folder.tag} previews={folder.preview} />)}
      </div>
      {!saved.length ? (
        <div className="collection-empty" id="arquivo-completo">
          <span className="stamp-mark blue">EMPTY FOLDER</span>
          <h2 className="section-title" style={{ marginTop: 18 }}>There is still plenty of room here.</h2>
          <p className="page-intro" style={{ margin: "12px auto 20px" }}>Open any letter and choose “Save in folder”. It will rest in this archive, organized by theme.</p>
          <Link href="/discover" className="text-link">Discover letters ↗</Link>
        </div>
      ) : (
        <section className="section-block" id="arquivo-completo">
          <div className="section-heading"><div><p className="section-kicker">Main folder</p><h2 className="section-title">All I've Kept</h2></div></div>
          <div className="letter-grid">{saved.map((letter) => <LetterCard key={letter.id} letter={letter} />)}</div>
        </section>
      )}
      {groups.map((folder) => (
        <section className="section-block" id={`folder-${folder.id}`} key={folder.id}>
          <div className="section-heading"><div><p className="section-kicker">{folder.tag}</p><h2 className="section-title">{folder.title}</h2></div></div>
          {folder.items.length ? <div className="letter-grid">{folder.items.map((letter) => <LetterCard key={letter.id} letter={letter} />)}</div> : <p className="page-intro">This folder is still waiting for its first letter.</p>}
        </section>
      ))}
    </div>
  );
}
