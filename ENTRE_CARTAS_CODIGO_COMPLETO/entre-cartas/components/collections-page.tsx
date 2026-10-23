"use client";

import Link from "next/link";
import { folders } from "@/lib/folders";
import { letters } from "@/lib/letters";
import { useArchive } from "@/components/archive-store";
import { Folder, LetterCard, Sticker, TornPaper } from "@/components/paper-kit";

export function CollectionsPage() {
  const { savedIds, folderById } = useArchive();
  return <main className="site-main collections-page">
    <div className="page-ribbon"><Link href="/">INÍCIO</Link><span> / </span><span>MINHA CAIXA</span></div>
    <header className="collections-intro"><span className="section-kicker">PASTAS DO SEU ARQUIVO</span><h1>Coisas que <em>ficam por perto.</em></h1><p>Uma carta guardada nunca perde o endereço de volta.</p><span className="collections-intro__seal">✉<small>MEU<br />ARQUIVO</small></span></header>
    <div className="collection-folder-shelf">{folders.map((folder, index) => <Folder key={folder.id} label={folder.label} note={folder.note} color={folder.color} count={savedIds.filter((id) => folderById[id] === folder.id).length} href={`#${folder.id}`} className={`folder--tilt-${index + 1}`} />)}</div>
    <div className="collection-notice"><Sticker>NOTA</Sticker><span>Suas escolhas ficam neste navegador. Ao marcar uma carta, ela entra na pasta “Reler devagar”.</span></div>
    <div className="folder-contents">{folders.map((folder, index) => {
      const contents = letters.filter((letter) => savedIds.includes(letter.id) && folderById[letter.id] === folder.id);
      return <section className="folder-content" id={folder.id} key={folder.id}>
        <div className="folder-content__head"><span className={`folder-content__icon folder-content__icon--${index + 1}`} aria-hidden="true">▱</span><div><span className="section-kicker">PASTA {String(index + 1).padStart(2, "0")}</span><h2>{folder.label}</h2></div><span className="folder-content__count">{String(contents.length).padStart(2, "0")}</span></div>
        <p className="folder-content__note">{folder.note}</p>
        {contents.length ? <div className="letter-shelf">{contents.map((letter) => <LetterCard key={letter.id} letter={letter} compact />)}</div> : <div className="folder-empty"><span aria-hidden="true">✉</span><p>A pasta ainda está vazia.</p><Link href="/arquivo">Escolher uma carta para guardar ↗</Link></div>}
      </section>;
    })}</div>
    <TornPaper className="collections-footnote">cada carta encontra sua própria prateleira</TornPaper>
  </main>;
}
